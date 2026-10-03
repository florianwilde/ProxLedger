# #042 Cluster-Knoten falsch gelesen, wenn ein QDevice im Spiel ist
**Status:** erledigt
**Meilenstein:** v0.24.1
**Labels:** bug, agent
**Geschätzt:** 1 h   **Tatsächlich:** 0 h 20 min

## Auslöser
Florians Cluster hat drei Knoten (`hv-pve-01`, `hv-pve-02`, `hv-pve-05`). ProxLedger zeigte vier
„Cluster-Knoten“: `A,V,NMW`, `A,V,NMW`, `NR` und `Qdevice`.

## Ursache
Der Agent nahm aus `pvecm nodes` blind die dritte Spalte als Namen. Ohne QDevice stimmt das:

```
    Nodeid      Votes Name
         1          1 hv-rz5-pve-01 (local)
```

Mit QDevice steht dort aber dessen Zustand, und der Name rutscht eine Spalte weiter:

```
    Nodeid      Votes    Qdevice Name
         1          1    A,V,NMW hv-pve-01
         0          1            Qdevice (votes 1)
```

Gemeldet wurden damit die Zustandskürzel – und das QDevice selbst als vierter „Knoten“.

## Behebung
Die Spalte „Name“ wird aus der Kopfzeile bestimmt, statt sie zu erraten. Die Zeile des QDevice trägt
die Nodeid 0 und wird übersprungen. Beide Ausgabeformen sind als Testfall hinterlegt.

## Folgen
Die Warnregel „Cluster-Knoten ohne Agent“ hatte dadurch Warnungen für Knoten erzeugt, die es nicht
gibt. Sie schließen sich von selbst, sobald die Agents mit der neuen Fassung gemeldet haben.

## Lehre
Dritter Fall in dieser Reihe: Eine Ausgabe, die beim Feldtest auf **einem** Cluster richtig gelesen
wurde, ist nicht auf jedem Cluster gleich. Spalten gehören über ihre Überschrift angesprochen, nicht
über ihre Position.
