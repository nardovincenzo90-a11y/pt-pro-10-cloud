import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const required = [
  "native/PTPROSmartWatch/project.yml",
  "native/PTPROSmartWatch/App/PTPROApp.swift",
  "native/PTPROSmartWatch/WatchApp/PTPROWatchApp.swift",
  "native/PTPROSmartWatch/WatchApp/WatchHealthWorkoutManager.swift",
  "native/PTPROSmartWatch/Packages/PTPROCore/Package.swift",
  "supabase/PT-PRO_12_SMART_WATCH_FOUNDATION.sql",
];

for (const path of required) assert.ok(fs.existsSync(path), `File mancante: ${path}`);

const migration = read(required.at(-1));
for (const marker of [
  "create table if not exists public.workout_sync_events",
  "create unique index if not exists uq_workout_sets_client_event",
  "create or replace function public.ptpro_ingest_watch_event",
  "alter table public.workout_sessions",
]) assert.ok(migration.includes(marker), `Migrazione incompleta: ${marker}`);

assert.ok(!/drop table|truncate table|delete from/i.test(migration), "La migrazione Watch deve restare additiva");

const watchModel = read("native/PTPROSmartWatch/WatchApp/WatchAppModel.swift");
assert.ok(watchModel.includes("persistState(active: true)"), "Stato Watch non persistito");
assert.ok(watchModel.includes("recoverActiveWorkout"), "Recupero sessione mancante");

const connectivity = read("native/PTPROSmartWatch/WatchApp/WatchConnectivityCoordinator.swift");
assert.ok(connectivity.includes("syncAcknowledgement"), "ACK di sincronizzazione mancante");
assert.ok(connectivity.includes("outboxKey"), "Coda locale durevole mancante");

console.log("PT-PRO Smart Watch foundation: OK");

