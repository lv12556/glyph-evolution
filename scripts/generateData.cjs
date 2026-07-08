/**
 * Data Generation Script
 * Generates per-group shape data, features.csv, pca.csv from PNG filenames
 * Simulates 50 writing attempts with progressive refinement
 */
const fs = require('fs');
const path = require('path');

const PNG_DIR = path.resolve(__dirname, '../../数据集/篆书纵向组合_20组每组6种顺序/zhuanshu_combinations');
const OUTPUT_DIR = path.resolve(__dirname, '../public/data');
const TIME_STEPS = 50;
const NUM_GROUPS = 20;
const ORDERS_PER_GROUP = 6;

// ── Character stroke templates ───────────────────────────────
function buildStrokeTemplates() {
  const templates = {
    '节': [[[20,5],[80,5],[80,10],[20,10]],[[50,10],[50,40]],[[30,40],[70,40],[70,55],[30,55],[30,40]]],
    '考': [[[15,5],[85,5],[85,10],[15,10]],[[50,10],[50,45]],[[25,25],[75,25],[75,30],[25,30]],[[35,50],[65,50],[65,65],[35,65],[35,50]]],
    '这': [[[15,5],[30,5],[30,30],[15,30]],[[30,10],[50,10],[50,30],[30,30]],[[10,35],[90,35],[90,40],[10,40]],[[45,40],[45,60]]],
    '报': [[[20,5],[50,5],[50,35],[20,35],[20,5]],[[55,5],[60,5],[60,95],[55,95]],[[30,40],[75,40]],[[35,60],[65,60],[65,75],[35,75],[35,60]]],
    '兴': [[[30,5],[70,5],[70,15],[30,15],[30,5]],[[10,20],[90,20],[90,25],[10,25]],[[35,25],[35,50]],[[50,25],[50,60]],[[65,25],[65,50]],[[20,50],[80,50]]],
    '长': [[[15,5],[30,5],[30,75],[15,75],[15,5]],[[30,20],[85,20]],[[55,5],[60,5],[60,80],[55,80]],[[40,55],[75,55],[60,75]]],
    '及': [[[20,5],[80,5],[80,15],[20,15],[20,5]],[[50,20],[50,50]],[[30,50],[80,50],[80,55],[30,55]],[[45,55],[70,55],[55,75]]],
    '以': [[[20,5],[50,5],[50,25],[20,25],[20,5]],[[10,30],[40,30]],[[40,15],[55,15],[55,80],[40,80]],[[20,50],[50,50],[35,75]]],
    '近': [[[15,5],[45,5],[45,85],[15,85],[15,5]],[[10,40],[90,40]],[[35,65],[70,65],[55,85]]],
    '就': [[[15,5],[85,5],[85,10],[15,10]],[[50,10],[50,50]],[[35,30],[65,30]],[[15,55],[85,55]],[[35,60],[65,60],[50,80]]],
    '克': [[[20,5],[80,5],[80,10],[20,10]],[[50,10],[50,60]],[[35,30],[65,30]],[[30,60],[70,60],[50,80]]],
    '反': [[[10,5],[90,5],[90,10],[10,10]],[[50,10],[50,40]],[[30,40],[80,40]],[[45,45],[70,45],[55,65]]],
  };

  const extraChars = '处爱坐期应表者年候海叫该务做与您活面言复友哪认行它取无边风要交息包指达也收深她力英斯每为让';
  extraChars.split('').filter(c => !templates[c]).forEach((char, idx) => {
    const seed = char.charCodeAt(0);
    const rng = (min, max, s) => { const x = Math.sin(s * 12.9898 + seed) * 43758.5453; return min + (x - Math.floor(x)) * (max - min); };
    const strokes = [];
    const w1 = rng(55, 88, 1);
    strokes.push([[rng(10,25,2), rng(3,8,3)], [w1, rng(3,8,4)], [w1, rng(6,12,5)], [rng(10,25,6), rng(6,12,7)]]);
    const cx = rng(38, 58, 10);
    const vh = rng(35, 58, 11);
    strokes.push([[cx, rng(8,15,12)], [cx, vh]]);
    if (rng(0,1,16) > 0.3) {
      strokes.push([[rng(15,30,19), rng(28,38,18)], [rng(52,82,20), rng(28,38,21)]]);
    }
    strokes.push([[rng(20,35,25), rng(45,65,26)], [rng(12,22,27), rng(55,78,28)], [rng(55,75,30), rng(55,78,31)], [rng(72,88,32), rng(45,65,33)]]);
    templates[char] = strokes;
  });
  return templates;
}

const CHAR_TEMPLATES = buildStrokeTemplates();

// ── Parse from PNG files ─────────────────────────────────────
function parseGroupsFromFiles() {
  const resultGroups = [];
  if (!fs.existsSync(PNG_DIR)) {
    console.warn(`PNG directory not found, generating from template chars.`);
    const allChars = Object.keys(CHAR_TEMPLATES);
    for (let g = 1; g <= NUM_GROUPS; g++) {
      const gChars = [];
      for (let i = 0; i < 3; i++) {
        const idx = (g - 1) * 3 + i;
        gChars.push(idx < allChars.length ? allChars[idx] : allChars[(idx * 7 + 3) % allChars.length]);
      }
      resultGroups.push({ id: `组${String(g).padStart(2, '0')}`, chars: gChars });
    }
    return resultGroups;
  }

  const files = fs.readdirSync(PNG_DIR).filter(f => f.endsWith('.png'));
  const groupMap = new Map();
  files.forEach(f => {
    const match = f.match(/^(组\d+)_(排\d+)_(.+)\.png$/);
    if (!match) return;
    const [, groupId, , charsStr] = match;
    if (!groupMap.has(groupId)) groupMap.set(groupId, charsStr.split('').filter(c => c.trim()));
  });
  groupMap.forEach((chars, id) => resultGroups.push({ id, chars: [...new Set(chars)] }));
  resultGroups.sort((a, b) => a.id.localeCompare(b.id));
  return resultGroups;
}

// ── Generate ─────────────────────────────────────────────────
const ORDERS = Array.from({ length: ORDERS_PER_GROUP }, (_, i) => `排${String(i + 1).padStart(2, '0')}`);
const PERMS = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

function generateTimeStep(charName, charIdx, orderIdx, t) {
  const template = CHAR_TEMPLATES[charName];
  if (!template) return [];
  const noiseLevel = 10 * Math.exp(-t / 10) + 1.5;
  const orderBias = (orderIdx - 2.5) * 2.5;
  const yOffset = charIdx * 105;
  return template.map((stroke, si) =>
    stroke.map(([px, py]) => [
      Math.round(Math.max(0, Math.min(100, px + Math.sin(t * 0.3 + si * 1.7 + orderIdx * 0.9) * noiseLevel + orderBias)) * 10) / 10,
      Math.round(Math.max(0, Math.min(315, py + yOffset + Math.cos(t * 0.25 + si * 1.3 + orderIdx * 0.7) * noiseLevel)) * 10) / 10
    ])
  );
}

function generateGroupFile(group) {
  const data = { id: group.id, chars: group.chars, orders: {} };
  ORDERS.forEach((orderId, orderIdx) => {
    const charPerm = PERMS[orderIdx].map(i => group.chars[i]);
    data.orders[orderId] = { charOrder: charPerm, sequence: [] };
    for (let t = 0; t < TIME_STEPS; t++) {
      const step = { time: t + 1, chars: {} };
      charPerm.forEach((charName, ci) => {
        step.chars[charName] = generateTimeStep(charName, ci, orderIdx, t);
      });
      data.orders[orderId].sequence.push(step);
    }
  });
  return data;
}

function computeFeaturesForStep(groupId, orderId, charName, time, strokes) {
  if (!strokes || strokes.length === 0) return null;
  const allPts = strokes.flat();
  if (allPts.length === 0) return null;
  const xs = allPts.map(p => p[0]), ys = allPts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY;
  const cx = xs.reduce((a,b)=>a+b,0)/xs.length, cy = ys.reduce((a,b)=>a+b,0)/ys.length;
  let perimeter = 0;
  strokes.forEach(s => { for (let i=1;i<s.length;i++) { const dx=s[i][0]-s[i-1][0],dy=s[i][1]-s[i-1][1]; perimeter+=Math.sqrt(dx*dx+dy*dy); } });
  const area = w * h;
  const compactness = perimeter > 0 ? (4*Math.PI*area)/(perimeter*perimeter) : 0;
  return [groupId,orderId,charName,time,(h>0?w/h:1).toFixed(4),cx.toFixed(2),cy.toFixed(2),w.toFixed(2),h.toFixed(2),perimeter.toFixed(2),strokes.length,compactness.toFixed(4),(area>0?allPts.length/area:0).toFixed(6)].join(',');
}

function computePCAForChar(groupId, orderId, charName, groupNum, orderNum, charCode) {
  const rows = [];
  const seed = (charCode * 7 + groupNum * 13 + orderNum * 3) % 100;
  for (let t = 0; t < TIME_STEPS; t++) {
    const pc1 = ((charCode%10)-5 + (groupNum-10)*0.3 + (1-t/TIME_STEPS)*8 + Math.sin(t*0.2+seed)*1.5 + Math.cos(t*0.15+seed*1.3)*0.8 + (orderNum-3.5)*1.2).toFixed(4);
    const pc2 = ((charCode%7)-3.5 + (groupNum-10)*0.2 + Math.sin(t*0.08+seed*0.7)*3 + Math.cos(t*0.18+seed*1.1)*1.2 + (orderNum-3.5)*0.8).toFixed(4);
    rows.push([groupId,orderId,charName,t+1,pc1,pc2].join(','));
  }
  return rows;
}

// ── Main ─────────────────────────────────────────────────────
function main() {
  console.log('=== Glyph Evolution Data Generator ===\n');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const groups = parseGroupsFromFiles();
  console.log(`Groups: ${groups.length}, Characters: ${groups.flatMap(g=>g.chars).filter((v,i,a)=>a.indexOf(v)===i).length}`);

  // Generate per-group shape files
  const shapeDir = path.join(OUTPUT_DIR, 'shapes');
  if (!fs.existsSync(shapeDir)) fs.mkdirSync(shapeDir, { recursive: true });

  groups.forEach((group, gi) => {
    const data = generateGroupFile(group);
    const fpath = path.join(shapeDir, `${group.id}.json`);
    fs.writeFileSync(fpath, JSON.stringify(data), 'utf-8');
    const pct = Math.round((gi + 1) / groups.length * 100);
    if (pct % 20 === 0 || gi === groups.length - 1) console.log(`  shapes ${pct}% (${gi+1}/${groups.length})`);
  });

  // Index file
  fs.writeFileSync(path.join(shapeDir, 'index.json'), JSON.stringify({
    groups: groups.map(g => ({ id: g.id, chars: g.chars, file: `${g.id}.json` })),
    orders: ORDERS,
    timeSteps: TIME_STEPS
  }), 'utf-8');

  // Generate features.csv
  console.log('Generating features.csv...');
  const featRows = ['group,order,char,time,aspect_ratio,centroid_x,centroid_y,width,height,perimeter,stroke_count,compactness,occupancy'];
  groups.forEach(group => {
    const gData = JSON.parse(fs.readFileSync(path.join(shapeDir, `${group.id}.json`), 'utf-8'));
    ORDERS.forEach((orderId, orderIdx) => {
      gData.orders[orderId].sequence.forEach(step => {
        Object.entries(step.chars).forEach(([charName, strokes]) => {
          const row = computeFeaturesForStep(group.id, orderId, charName, step.time, strokes);
          if (row) featRows.push(row);
        });
      });
    });
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'features.csv'), featRows.join('\n'), 'utf-8');
  console.log(`  features.csv (${featRows.length} rows)`);

  // Generate pca.csv
  console.log('Generating pca.csv...');
  const pcaRows = ['group,order,char,time,pc1,pc2'];
  groups.forEach(group => {
    const groupNum = parseInt(group.id.replace('组', ''));
    group.chars.forEach(charName => {
      const charCode = charName.charCodeAt(0);
      ORDERS.forEach((orderId, orderIdx) => {
        const orderNum = orderIdx + 1;
        pcaRows.push(...computePCAForChar(group.id, orderId, charName, groupNum, orderNum, charCode));
      });
    });
  });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pca.csv'), pcaRows.join('\n'), 'utf-8');
  console.log(`  pca.csv (${pcaRows.length} rows)`);

  // Group summary
  fs.writeFileSync(path.join(OUTPUT_DIR, 'groups.json'), JSON.stringify({
    groups: groups.map(g => ({ id: g.id, chars: g.chars })),
    orders: ORDERS,
    timeSteps: TIME_STEPS
  }), 'utf-8');

  console.log('\n=== Done! ===');
}

main();
