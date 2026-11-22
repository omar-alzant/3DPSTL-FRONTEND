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
import phoneCase from './phoneCase.js';
import qrCode from './qrCode.js';
import coaster from './coaster.js';
import cookieCutter from './cookieCutter.js';
import stamp from './stamp.js';
import ramadanTray from './ramadanTray.js';
import deskOrganizer from './deskOrganizer.js';
import lebanonKeychain from './lebanonKeychain.js';
import lithophane from './lithophane.js';
import photoLampshade from './photoLampshade.js';
import vase from './vase.js';
import puzzle from './puzzle.js';
import clicker from './clicker.js';
import jobOutfit from './jobOutfit.js';

export const TOOLS = [
  jobOutfit, keychain, qrCode, phoneCase, coaster, cookieCutter, stamp, ramadanTray, deskOrganizer, lebanonKeychain,
  lithophane, photoLampshade, vase, puzzle, clicker, initialSign, birthSign,
  dualName, lbPlate, plate, keycaps, pencilTopper, toteBag, flexiToy,
];

export const getTool = (id) => TOOLS.find((t) => t.id === id);

export const defaults = (tool) => Object.fromEntries(tool.params.map((p) => [p.key, p.default]));
