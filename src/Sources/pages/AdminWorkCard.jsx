// Admin → "صورة شغلنا": make a 3DSTL picture of a finished piece from any device (phone included)
import React from "react";
import WorkCardMaker from "../components/WorkCardMaker";
import { useLang } from "../i18n/LanguageContext";

export default function AdminWorkCard() {
  const { tx } = useLang();
  return (
    <div className="p-3 p-md-4">
      <h2 className="mb-1">{tx("Work picture", "صورة شغلنا")}</h2>
      <p className="text-muted mb-4">
        {tx("Put photos of a piece on a 3DSTL card, then download or share it. To add it to an item, open the item in “Items” and press “Work picture”.",
          "حط صور القطعة على كرت 3DSTL، وبعدين نزّلها أو شاركها. لتزيدها على قطعة، افتح القطعة بـ«القطع» وكبوس «صورة شغلنا».")}
      </p>
      <WorkCardMaker />
    </div>
  );
}
