// سجلّ الأدوات: لإضافة أداة جديدة أنشئ ملفاً بنفس البنية وأضفه هنا
import keychain from './keychain.js';
import pencilTopper from './pencilTopper.js';
import plate from './plate.js';
import keycaps from './keycaps.js';
import lbPlate from './lbPlate.js';
import dualName from './dualName.js';
import initialSign from './initialSign.js';
import toteBag from './toteBag.js';
import flexiToy from './flexiToy.js';
import birthSign from './birthSign.js';

export const TOOLS = [keychain, pencilTopper, initialSign, dualName, lbPlate, plate, keycaps, toteBag, flexiToy, birthSign];

export const getTool = (id) => TOOLS.find((t) => t.id === id);

export const defaults = (tool) => Object.fromEntries(tool.params.map((p) => [p.key, p.default]));
