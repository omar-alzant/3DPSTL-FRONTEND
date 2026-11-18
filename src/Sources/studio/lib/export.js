// تصدير STL (ملف واحد أو ملف لكل لون) و 3MF متعدد الأجزاء لبرامج مثل Bambu Studio
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { zipSync, strToU8 } from 'fflate';
import { merge, volume, THREE } from './geo.js';
import bambuA1 from './bambuA1.json';

export function download(data, filename, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const slug = (s) => (s || 'design').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'design';

function stl(geometry) {
  const mesh = new THREE.Mesh(geometry);
  return new STLExporter().parse(mesh, { binary: true });
}

export function exportSTL(parts, name) {
  download(stl(merge(parts.map((p) => p.geometry))), `${slug(name)}.stl`);
}

/** ملف STL لكل لون داخل ZIP (للطباعة متعددة الألوان) */
export function exportSTLByColor(parts, name) {
  const byColor = new Map();
  for (const p of parts) {
    if (!byColor.has(p.color)) byColor.set(p.color, { label: p.name, list: [] });
    byColor.get(p.color).list.push(p.geometry);
  }
  const files = {};
  let i = 1;
  for (const [color, { label, list }] of byColor) {
    files[`${slug(name)}-${i++}-${slug(label)}-${color.replace('#', '')}.stl`] = new Uint8Array(stl(merge(list)).buffer);
  }
  download(zipSync(files), `${slug(name)}-colors.zip`, 'application/zip');
}

const xml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 3MF ملوّن متوافق مع Bambu Studio و Orca و PrusaSlicer:
 * - كائن واحد وشبكة واحدة، وكل مثلث يحمل لونه (pid/p1) — هذا ما يقرأه Bambu/Orca من ملفات 3MF
 *   غير الصادرة عنهما، ثم يطابق كل لون مع أقرب فيلامنت في القائمة.
 *   (البنية القديمة كانت تضع اللون على أجزاء داخل components، فيتجاهلها Bambu ويظهر الملف بلون واحد)
 * - ملف Slic3r_PE_model.config يقسم الشبكة إلى أجزاء (volume) لكل لون مع رقم الفيلامنت، لـ PrusaSlicer.
 */
export function build3MF(parts, name) {
  const colors = [];
  const byColor = new Map();
  for (const p of parts) {
    if (!p.geometry) continue;
    if (!byColor.has(p.color)) {
      byColor.set(p.color, { label: p.name, list: [] });
      colors.push(p.color);
    }
    byColor.get(p.color).list.push(p.geometry);
  }
  const verts = [];
  const tris = [];
  const volumes = [];
  colors.forEach((color, ci) => {
    const g = merge(byColor.get(color).list);
    const pos = g.attributes.position.array;
    // دمج الرؤوس المتطابقة داخل نفس اللون فقط (حتى تبقى الأجزاء منفصلة عند التلامس)
    const map = new Map();
    const idx = [];
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i].toFixed(4), y = pos[i + 1].toFixed(4), z = pos[i + 2].toFixed(4);
      const k = `${x},${y},${z}`;
      let vi = map.get(k);
      if (vi === undefined) {
        vi = verts.length;
        map.set(k, vi);
        verts.push(`<vertex x="${x}" y="${y}" z="${z}"/>`);
      }
      idx.push(vi);
    }
    const first = tris.length;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      if (a !== b && b !== c && a !== c) tris.push(`<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${ci}"/>`);
    }
    if (tris.length > first) volumes.push({ first, last: tris.length - 1, ci, label: byColor.get(color).label });
  });

  const title = xml(name);
  const materials = colors
    .map((c, i) => `<base name="${xml(byColor.get(c).label || `color-${i + 1}`)}" displaycolor="${c.toUpperCase()}FF"/>`)
    .join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">
<metadata name="Title">${title}</metadata>
<metadata name="Application">3DPSTL Studio</metadata>
<metadata name="slic3rpe:Version3mf">1</metadata>
<resources>
<basematerials id="1">${materials}</basematerials>
<object id="2" name="${title}" type="model" pid="1" pindex="0"><mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>
</resources>
<build><item objectid="2"/></build>
</model>`;

  const volumesXml = volumes
    .map(
      (v) => `  <volume firstid="${v.first}" lastid="${v.last}">
   <metadata type="volume" key="name" value="${xml(v.label || `color-${v.ci + 1}`)}"/>
   <metadata type="volume" key="volume_type" value="ModelPart"/>
   <metadata type="volume" key="extruder" value="${v.ci + 1}"/>
  </volume>`
    )
    .join('\n');
  const prusa = `<?xml version="1.0" encoding="UTF-8"?>
<config>
 <object id="2" instances_count="1">
  <metadata type="object" key="name" value="${title}"/>
${volumesXml}
 </object>
</config>`;

  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="text/xml"/></Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
    ),
    '3D/3dmodel.model': strToU8(model),
    'Metadata/Slic3r_PE_model.config': strToU8(prusa),
  });
}

export function export3MF(parts, name) {
  download(build3MF(parts, name), `${slug(name)}.3mf`, 'model/3mf');
}

// ——— مشروع Bambu Studio (A1) بالألوان نفسها التي اختارها الزبون ———
// Bambu Studio يتجاهل ألوان ملفات 3MF العامة ويطابقها مع أقرب خيط عند المستخدم.
// لكن ملف المشروع الأصلي (بنفس بنية ما يحفظه Bambu Studio) يحمل قائمة الخيوط بألوانها في
// Metadata/project_settings.config، وكل جزء مربوط برقم خيطه في model_settings.config — فيفتح بالألوان الصحيحة.
const uuid = (a, b) => `${a.toString(16).padStart(8, '0')}-61cb-4c03-9d28-${b.toString(16).padStart(12, '0')}`;

function meshXml(g) {
  const pos = g.attributes.position.array;
  const verts = [];
  const map = new Map();
  let tris = '';
  const idx = [];
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i].toFixed(4), y = pos[i + 1].toFixed(4), z = pos[i + 2].toFixed(4);
    const k = `${x},${y},${z}`;
    let vi = map.get(k);
    if (vi === undefined) {
      vi = verts.length;
      map.set(k, vi);
      verts.push(`<vertex x="${x}" y="${y}" z="${z}"/>`);
    }
    idx.push(vi);
  }
  let n = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (a !== b && b !== c && a !== c) {
      tris += `<triangle v1="${a}" v2="${b}" v3="${c}"/>`;
      n++;
    }
  }
  return { xml: `<mesh><vertices>${verts.join('')}</vertices><triangles>${tris}</triangles></mesh>`, faces: n };
}

export function buildBambu3MF(parts, name) {
  // جزء لكل لون
  const colors = [];
  const byColor = new Map();
  for (const p of parts) {
    if (!p.geometry) continue;
    if (!byColor.has(p.color)) {
      byColor.set(p.color, { label: p.name, list: [] });
      colors.push(p.color);
    }
    byColor.get(p.color).list.push(p.geometry);
  }
  const N = colors.length;
  const box = new THREE.Box3();
  const meshes = colors.map((c) => {
    const g = merge(byColor.get(c).list);
    g.computeBoundingBox();
    box.union(g.boundingBox);
    return meshXml(g);
  });
  const title = xml(name);
  const mainId = N + 1;
  const today = new Date().toISOString().slice(0, 10);
  // وسط سرير A1 (256×256) والقاعدة على z = 0
  const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
  const T = `1 0 0 0 1 0 0 0 1 ${(128 - cx).toFixed(4)} ${(128 - cy).toFixed(4)} ${(-box.min.z).toFixed(4)}`;
  const ns =
    'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';

  const objects = meshes
    .map((m, i) => `  <object id="${i + 1}" p:UUID="${uuid(i + 1, i + 1)}" type="model">\n   ${m.xml}\n  </object>`)
    .join('\n');
  const objFile = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" ${ns}>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <resources>
${objects}
 </resources>
 <build/>
</model>`;

  const comps = colors
    .map((_, i) => `    <component p:path="/3D/Objects/object_1.model" objectid="${i + 1}" p:UUID="${uuid(0x10000 + i, i + 1)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`)
    .join('\n');
  const mainFile = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" ${ns}>
 <metadata name="Application">BambuStudio-02.07.01.57</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <metadata name="CreationDate">${today}</metadata>
 <metadata name="ModificationDate">${today}</metadata>
 <metadata name="Title">${title}</metadata>
 <metadata name="Designer">3DPSTL Studio</metadata>
 <resources>
  <object id="${mainId}" p:UUID="${uuid(mainId, 0)}" type="model">
   <components>
${comps}
   </components>
  </object>
 </resources>
 <build p:UUID="${uuid(0x20000, 1)}">
  <item objectid="${mainId}" p:UUID="${uuid(0x20000, 2)}" transform="${T}" printable="1"/>
 </build>
</model>`;

  const partsXml = colors
    .map(
      (c, i) => `    <part id="${i + 1}" subtype="normal_part">
      <metadata key="name" value="${xml(byColor.get(c).label || `color-${i + 1}`)}"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="extruder" value="${i + 1}"/>
      <mesh_stat face_count="${meshes[i].faces}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>`
    )
    .join('\n');
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="${mainId}">
    <metadata key="name" value="${title}"/>
    <metadata key="extruder" value="1"/>
    <metadata face_count="${meshes.reduce((s, m) => s + m.faces, 0)}"/>
${partsXml}
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    <model_instance>
      <metadata key="object_id" value="${mainId}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${100 + mainId}"/>
    </model_instance>
  </plate>
  <assemble>
  </assemble>
</config>`;

  // إعدادات المشروع: قالب A1 + خيط PLA لكل لون بلونه
  const settings = { ...bambuA1.base };
  for (const [k, v] of Object.entries(bambuA1.perFilament)) settings[k] = Array(N).fill(v);
  settings.filament_colour = colors.map((c) => c.toUpperCase() + 'FF');
  settings.filament_self_index = colors.map((_, i) => String(i + 1));
  settings.flush_volumes_matrix = [];
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) settings.flush_volumes_matrix.push(a === b ? '0' : '280');
  settings.different_settings_to_system = Array(N + 2).fill('');
  settings.inherits_group = Array(N + 2).fill('');

  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>'
    ),
    '3D/_rels/3dmodel.model.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>'
    ),
    '3D/3dmodel.model': strToU8(mainFile),
    '3D/Objects/object_1.model': strToU8(objFile),
    'Metadata/model_settings.config': strToU8(modelSettings),
    'Metadata/project_settings.config': strToU8(JSON.stringify(settings, null, 4)),
    'Metadata/slice_info.config': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n    <header_item key="X-BBL-Client-Type" value="slicer"/>\n    <header_item key="X-BBL-Client-Version" value="02.07.01.57"/>\n  </header>\n</config>'
    ),
  });
}

export function exportBambu3MF(parts, name) {
  download(buildBambu3MF(parts, name), `${slug(name)}-bambu.3mf`, 'model/3mf');
}

/**
 * إحصاءات: الأبعاد، الحجم، الوزن التقريبي (PLA)، ومعطيات وقت الطباعة:
 * - printedVolume: حجم البلاستيك الفعلي (جدران صلبة + حشو جزئي)
 * - layers: عدد الطبقات بسماكة 0.2 مم
 * - swaps: عدد مرات تبديل الخيط (في كل طبقة: عدد ألوانها − 1، وأحياناً تبديل إضافي بين الطبقات)
 * الوقت نفسه يُحسب في pricing.js حسب إعدادات الإدارة (سرعة الطباعة، مدة التبديل، التحمية)
 */
export const LAYER = 0.2;
export function stats(parts) {
  const box = new THREE.Box3();
  let vol = 0;
  for (const p of parts) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox);
    vol += volume(p.geometry);
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  // نسبة ملء تقريبية: الجدران صلبة والداخل 15%
  const printedVolume = vol * 0.75;
  const grams = (printedVolume / 1000) * 1.24;

  // الطبقات التي يظهر فيها كل لون
  const layers = Math.max(1, Math.ceil((size.z - 1e-6) / LAYER));
  const z0 = box.min.z;
  const byColor = new Map();
  for (const p of parts) {
    if (!byColor.has(p.color)) byColor.set(p.color, new Uint8Array(layers));
    const mark = byColor.get(p.color);
    const pos = p.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 9) {
      const a = pos[i + 2], b = pos[i + 5], c = pos[i + 8];
      const lo = Math.min(a, b, c) - z0, hi = Math.max(a, b, c) - z0;
      const l0 = Math.max(0, Math.floor(lo / LAYER + 1e-6)), l1 = Math.min(layers - 1, Math.ceil(hi / LAYER - 1e-6) - 1);
      for (let l = l0; l <= l1; l++) mark[l] = 1;
    }
  }
  let swaps = 0;
  let prev = null;
  const marks = [...byColor.values()];
  for (let l = 0; l < layers; l++) {
    const here = marks.map((m, i) => (m[l] ? i : -1)).filter((i) => i >= 0);
    if (!here.length) continue;
    swaps += here.length - 1;
    // نبدأ الطبقة باللون الأخير من الطبقة السابقة إن وُجد فيها، وإلا نحتاج تبديلاً إضافياً
    if (prev !== null && !here.includes(prev)) swaps++;
    prev = here.includes(prev) && here.length === 1 ? prev : here[here.length - 1];
  }
  return { size, volume: vol, grams, printedVolume, layers, swaps, colors: byColor.size };
}
