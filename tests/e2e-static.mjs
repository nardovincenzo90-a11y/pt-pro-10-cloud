import fs from 'node:fs';
const files=['app-manifest.js','auth-gate.js','app-1.js','app-2.js','app-3.js','app-4.js','app-5.js','app-6.js','progress-evolution.js','progress-report-evolution.js','nutrition-evolution.js','nutrition-cloud-engine.js','nutrition-runtime-evolution.js','smart-coach-evolution.js','calendar-coach-evolution.js','notifications-evolution.js','hardening-evolution.js','workout-summary-evolution.js','release-audit-evolution.js','sw.js'];
for(const f of files)if(!fs.existsSync(f))throw new Error('Missing '+f);
const all=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const contracts={
 auth:['/auth/v1/token','ptpro10_session','PTPRO_APP_MODULES'],
 workout:['api_startSession','api_saveSet','api_finishSession'],
 smartCoach:['api_getSmartPrescription9','weekly_checkins','workout_sessions','Prontezza e fatica'],
 progress:['measurements','goals','v_exercise_prs','progress_photos'],
 nutrition:['nutrition_plans','recipes','pantry_stock','shopping_lists','supplements','api_generateNutritionSmartMonth','protein_g_target','nutrition_days','meal_items','api_saveNutritionSmartDay'],
 calendarCoach:['calendar_events','notifications','coach_athletes'],
 notifications:['Notification.requestPermission',"addEventListener('push'",'notificationclick'],
 backup:['PT-PRO-backup-','tech_logs'],
 workoutSummary:['ALLENAMENTO COMPLETATO','workout_sets','completion_percent'],
 releaseAudit:['RLS blocca accesso anonimo','Smart Coach unico','Nutrizione unica']
};
for(const [area,tokens] of Object.entries(contracts))for(const token of tokens)if(!all.includes(token))throw new Error(`${area}: contract token missing: ${token}`);
const index=fs.readFileSync('index.html','utf8');for(const f of ['app-manifest.js','auth-gate.js','progress-evolution.js','progress-report-evolution.js','nutrition-evolution.js','nutrition-cloud-engine.js','nutrition-runtime-evolution.js','smart-coach-evolution.js','calendar-coach-evolution.js','notifications-evolution.js','hardening-evolution.js','workout-summary-evolution.js','release-audit-evolution.js'])if(!index.includes(f))throw new Error('index missing '+f);
console.log('PT-PRO static E2E contracts OK');
