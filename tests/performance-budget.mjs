import fs from 'node:fs';
const budget={
  'index.html':14_000,
  'styles.css':90_000,
  'app-manifest.js':5_000,
  'auth-gate.js':18_000,
  'cloud-evolution.js':40_000,
  'progress-evolution.js':20_000,
  'progress-report-evolution.js':24_000,
  'nutrition-evolution.js':20_000,
  'nutrition-cloud-engine.js':28_000,
  'nutrition-runtime-evolution.js':28_000,
  'smart-coach-evolution.js':20_000,
  'calendar-coach-evolution.js':20_000,
  'notifications-evolution.js':20_000,
  'hardening-evolution.js':20_000,
  'workout-summary-evolution.js':20_000,
  'release-audit-evolution.js':18_000
};
let total=0;
for(const [f,max] of Object.entries(budget)){
  const size=fs.statSync(f).size;total+=size;
  if(size>max)throw new Error(`${f} exceeds budget: ${size} > ${max}`);
}
const legacy=['app-1.js','app-2.js','app-3.js','app-4.js','app-5.js','app-6.js'].reduce((a,f)=>a+fs.statSync(f).size,0);
if(legacy>320_000)throw new Error(`Legacy bundle exceeds temporary budget: ${legacy}`);
console.log(`PT-PRO performance budget OK · RC1 ${total} bytes · legacy ${legacy} bytes`);
