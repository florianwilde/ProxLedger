import type { HostModel } from "@/generated/prisma/models";
import { prisma } from "@/lib/db";
import { erzeugeToken, hashToken } from "@/lib/tokens";
import {
  datumAusProxmox,
  produktAusEingabe,
  statusAusProxmox,
  type EnrollEingabe,
  type ReportEingabe,
} from "./schema";

export class AgentApiFehler extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    nachricht: string,
  ) {
    super(nachricht);
  }
}

export interface EnrollErgebnis {
  hostId: string;
  token: string;
  /** Wahr, wenn die Server-ID bereits zu einem anderen Host gehörte (Neuinstallation oder Klon). */
  serverIdBereitsBekannt: boolean;
  /** Wahr, wenn sich ein bereits registrierter Agent erneut meldet (z. B. nach Neuinstallation des Agents). */
  bestehenderHost: boolean;
}

/** Registriert einen Agent und gibt ihm einen host-spezifischen Token. */
export async function registriereAgent(
  eingabe: EnrollEingabe,
  enrollmentTokenKlartext: string,
): Promise<EnrollErgebnis> {
  const hash = hashToken(enrollmentTokenKlartext);
  const enrollToken = await prisma.enrollmentToken.findUnique({ where: { tokenHash: hash } });

  if (!enrollToken || enrollToken.widerrufenAm) {
    throw new AgentApiFehler(401, "token_ungueltig", "Enrollment-Token ist ungültig oder widerrufen.");
  }
  if (enrollToken.gueltigBis && enrollToken.gueltigBis.getTime() < Date.now()) {
    throw new AgentApiFehler(401, "token_abgelaufen", "Enrollment-Token ist abgelaufen.");
  }
  if (enrollToken.maxNutzungen !== null && enrollToken.nutzungen >= enrollToken.maxNutzungen) {
    throw new AgentApiFehler(401, "token_aufgebraucht", "Enrollment-Token wurde bereits zu oft verwendet.");
  }

  const produkt = produktAusEingabe(eingabe.produkt);
  if (!produkt) {
    throw new AgentApiFehler(422, "produkt_unbekannt", "Unbekanntes Produkt.");
  }

  const vorhanden = await prisma.host.findUnique({ where: { agentId: eingabe.agentId } });
  const fremderHostMitServerId = eingabe.serverId
    ? await prisma.host.findFirst({
        where: { serverId: eingabe.serverId, NOT: { agentId: eingabe.agentId } },
      })
    : null;

  const neuerToken = erzeugeToken("host");

  const hostId = await prisma.$transaction(async (tx) => {
    const host = vorhanden
      ? await tx.host.update({
          where: { id: vorhanden.id },
          data: {
            hostname: eingabe.hostname,
            fqdn: eingabe.fqdn ?? vorhanden.fqdn,
            produkt,
            agentVersion: eingabe.agentVersion ?? vorhanden.agentVersion,
            // Eine Kundenzuordnung aus dem Enrollment-Token nur ergänzen, nie überschreiben.
            kundeId: vorhanden.kundeId ?? enrollToken.kundeId,
            standortId: vorhanden.standortId ?? enrollToken.standortId,
          },
        })
      : await tx.host.create({
          data: {
            agentId: eingabe.agentId,
            hostname: eingabe.hostname,
            fqdn: eingabe.fqdn ?? null,
            produkt,
            serverId: eingabe.serverId ?? null,
            agentVersion: eingabe.agentVersion ?? null,
            kundeId: enrollToken.kundeId,
            standortId: enrollToken.standortId,
          },
        });

    await tx.agentToken.create({
      data: {
        hostId: host.id,
        tokenHash: neuerToken.hash,
        praefix: neuerToken.praefix,
        bezeichnung: `Registrierung ${eingabe.hostname}`,
      },
    });

    await tx.enrollmentToken.update({
      where: { id: enrollToken.id },
      data: { nutzungen: { increment: 1 } },
    });

    return host.id;
  });

  return {
    hostId,
    token: neuerToken.klartext,
    serverIdBereitsBekannt: fremderHostMitServerId !== null,
    bestehenderHost: vorhanden !== null,
  };
}

/** Prüft den Host-Token und liefert den zugehörigen Host. */
export async function authentifiziereHost(tokenKlartext: string): Promise<HostModel> {
  const eintrag = await prisma.agentToken.findUnique({
    where: { tokenHash: hashToken(tokenKlartext) },
    include: { host: true },
  });

  if (!eintrag || eintrag.widerrufenAm) {
    throw new AgentApiFehler(401, "token_ungueltig", "Host-Token ist ungültig oder widerrufen.");
  }

  await prisma.agentToken.update({
    where: { id: eintrag.id },
    data: { letzteNutzungAm: new Date() },
  });

  return eintrag.host;
}

export interface ReportErgebnis {
  reportId: string;
  /** Wahr, wenn derselbe Report bereits verarbeitet wurde (nachgesendeter Report). */
  doppelt: boolean;
  laufzeitVorschlagAngelegt: boolean;
}

/** Nimmt einen Report entgegen, aktualisiert den Host und schlägt bei Bedarf eine neue Laufzeit vor. */
export async function verarbeiteReport(
  host: HostModel,
  eingabe: ReportEingabe,
  quellIp: string | null,
): Promise<ReportErgebnis> {
  const bereitsVorhanden = await prisma.report.findUnique({ where: { reportId: eingabe.reportId } });
  if (bereitsVorhanden) {
    return { reportId: bereitsVorhanden.id, doppelt: true, laufzeitVorschlagAngelegt: false };
  }

  const erhobenAm = new Date(eingabe.erhobenAm);
  const status = statusAusProxmox(eingabe.subscription.status);
  const nextduedate = datumAusProxmox(eingabe.subscription.nextduedate);
  const regdate = datumAusProxmox(eingabe.subscription.regdate);
  const checktime = datumAusProxmox(eingabe.subscription.checktime);
  const key = eingabe.subscription.key ?? null;
  const serverId = eingabe.subscription.serverid ?? null;
  const produkt = produktAusEingabe(eingabe.produkt.typ) ?? host.produkt;

  // Nachgesendete ältere Reports werden gespeichert, dürfen den aktuellen Stand aber nicht überschreiben.
  const istNeuesterStand = !host.letzterReportAm || erhobenAm.getTime() >= host.letzterReportAm.getTime();

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        reportId: eingabe.reportId,
        hostId: host.id,
        erhobenAm,
        subStatus: status,
        subKey: key,
        subNextduedate: nextduedate,
        serverId,
        hostname: eingabe.host.hostname ?? null,
        produktVersion: eingabe.produkt.version ?? null,
        kernel: eingabe.host.kernel ?? null,
        sockets: eingabe.host.sockets ?? null,
        paketUpdates: eingabe.host.paketUpdates ?? null,
        agentVersion: eingabe.agentVersion ?? null,
        ips: eingabe.host.ips ?? [],
        quellIp,
        rohdaten: eingabe,
      },
    });

    if (istNeuesterStand) {
      await tx.host.update({
        where: { id: host.id },
        data: {
          hostname: eingabe.host.hostname ?? host.hostname,
          fqdn: eingabe.host.fqdn ?? host.fqdn,
          produkt,
          produktVersion: eingabe.produkt.version ?? host.produktVersion,
          kernel: eingabe.host.kernel ?? host.kernel,
          serverId: serverId ?? host.serverId,
          clusterName: eingabe.host.clusterName ?? host.clusterName,
          nodeName: eingabe.host.nodeName ?? host.nodeName,
          ips: eingabe.host.ips ?? host.ips,
          sockets: eingabe.host.sockets ?? host.sockets,
          cpuModell: eingabe.host.cpuModell ?? host.cpuModell,
          uptimeSekunden:
            eingabe.host.uptimeSekunden === null || eingabe.host.uptimeSekunden === undefined
              ? host.uptimeSekunden
              : BigInt(eingabe.host.uptimeSekunden),
          paketUpdates: eingabe.host.paketUpdates ?? host.paketUpdates,
          agentVersion: eingabe.agentVersion ?? host.agentVersion,
          subKey: key,
          subStatus: status,
          subLevel: eingabe.subscription.level ?? null,
          subProduktname: eingabe.subscription.productname ?? null,
          subLizenzierteSockets: eingabe.subscription.sockets ?? null,
          subRegdate: regdate,
          subNextduedate: nextduedate,
          subChecktime: checktime,
          letzterReportAm: erhobenAm,
        },
      });
    }

    if (key) {
      await tx.subscriptionKeyHistorie.upsert({
        where: { hostId_key: { hostId: host.id, key } },
        update: { letzteMeldung: erhobenAm },
        create: { hostId: host.id, key, ersteMeldung: erhobenAm, letzteMeldung: erhobenAm },
      });
    }

    if (serverId) {
      await tx.serverIdHistorie.upsert({
        where: { hostId_serverId: { hostId: host.id, serverId } },
        update: { letzteMeldung: erhobenAm },
        create: { hostId: host.id, serverId, ersteMeldung: erhobenAm, letzteMeldung: erhobenAm },
      });
    }

    let laufzeitVorschlagAngelegt = false;
    if (key && nextduedate && istNeuesterStand) {
      const vorhanden = await tx.laufzeit.findUnique({
        where: { hostId_start: { hostId: host.id, start: nextduedate } },
      });

      if (!vorhanden) {
        await tx.laufzeit.create({
          data: {
            hostId: host.id,
            key,
            start: nextduedate,
            ende: laufzeitEnde(nextduedate),
            status: "VORSCHLAG",
          },
        });
        laufzeitVorschlagAngelegt = true;
      }
    }

    return { reportId: report.id, doppelt: false, laufzeitVorschlagAngelegt };
  });
}

/** Eine Subscription-Periode läuft ein Jahr, das Enddatum ist der Tag davor. */
export function laufzeitEnde(start: Date): Date {
  const ende = new Date(start);
  ende.setUTCFullYear(ende.getUTCFullYear() + 1);
  ende.setUTCDate(ende.getUTCDate() - 1);
  return ende;
}
