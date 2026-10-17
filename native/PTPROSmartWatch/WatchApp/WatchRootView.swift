import SwiftUI

struct WatchRootView: View {
    @EnvironmentObject private var model: WatchAppModel

    var body: some View {
        Group {
            if model.snapshot == nil {
                VStack(spacing: 10) {
                    Image(systemName: "applewatch.radiowaves.left.and.right").font(.title)
                    Text("Apri PT-PRO su iPhone")
                        .font(.headline).multilineTextAlignment(.center)
                    Text("La scheda V-Shape arriverà automaticamente.")
                        .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
            } else if !model.health.isRunning {
                preflight
            } else {
                activeWorkout
            }
        }
        .alert("PT-PRO", isPresented: .constant(model.errorMessage != nil)) {
            Button("OK") { model.errorMessage = nil }
        } message: { Text(model.errorMessage ?? "") }
    }

    private var preflight: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text(model.snapshot?.programTitle ?? "PT-PRO").font(.caption).foregroundStyle(.cyan)
                Text(model.snapshot?.dayTitle ?? "Allenamento").font(.headline).multilineTextAlignment(.center)
                Text("\(model.snapshot?.exercises.count ?? 0) esercizi")
                    .font(.caption).foregroundStyle(.secondary)
                Button("Inizia") { Task { await model.startWorkout() } }
                    .buttonStyle(.borderedProminent).tint(.cyan)
            }
        }
    }

    private var activeWorkout: some View {
        TabView {
            metrics
            setEntry
            controls
        }
        .tabViewStyle(.verticalPage)
    }

    private var metrics: some View {
        VStack(spacing: 5) {
            Text("BPM").font(.caption2).foregroundStyle(.secondary)
            Text(model.health.heartRate.map { String(Int($0)) } ?? "—")
                .font(.system(size: 36, weight: .bold, design: .rounded)).foregroundStyle(.red)
            HStack {
                Label(model.health.elapsedText, systemImage: "timer")
                Label("\(Int(model.health.activeEnergy)) kcal", systemImage: "flame")
            }.font(.caption)
            if model.restRemaining > 0 {
                Text("Recupero \(model.restRemaining)s").font(.headline).foregroundStyle(.cyan)
            }
        }
    }

    private var setEntry: some View {
        ScrollView {
            VStack(spacing: 7) {
                Text(model.currentExercise?.name ?? "Esercizio")
                    .font(.headline).multilineTextAlignment(.center)
                Text("Serie \(model.setIndex + 1) · target \(model.currentPrescription?.repetitions ?? "—")")
                    .font(.caption).foregroundStyle(.secondary)
                HStack {
                    Stepper("\(model.load, specifier: "%.1f") kg", value: $model.load, in: 0...500, step: 0.5)
                    Stepper("\(model.repetitions) rep", value: $model.repetitions, in: 0...100)
                }.font(.caption2)
                Button("Serie completata") { Task { await model.completeCurrentSet() } }
                    .buttonStyle(.borderedProminent).tint(.cyan)
            }
        }
    }

    private var controls: some View {
        VStack(spacing: 8) {
            Button(model.health.isPaused ? "Riprendi" : "Pausa") { model.pauseOrResume() }
            Button("Termina", role: .destructive) { Task { await model.endWorkout() } }
            Text("La sessione resta attiva finché non premi Termina.")
                .font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
    }
}
