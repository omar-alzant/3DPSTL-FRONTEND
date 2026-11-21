import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import {
  BsTags,
  BsListUl,
  BsGrid,
  BsBoxes,
  BsBoxSeam,
  BsImages,
  BsCart3,
  BsChevronLeft,
  BsDisc,
  BsBadge3D,
  BsCurrencyDollar,
  BsCoin,
  BsActivity,
} from "react-icons/bs";

import "../Style/AdminLayout.css";
import useAdminSummary from "../hooks/useAdminSummary";
import { useLang } from '../i18n/LanguageContext';

// Grouped by what you do there. `count` = which waiting-items badge to show (useAdminSummary).
const ADMIN_MENU = [
  {
    title: ["Orders", "الطلبات"],
    items: [
      { label: "Studio Orders", ar: "طلبات الاستوديو", path: "studio", icon: <BsBadge3D />, count: "studio" },
      { label: "Orders", ar: "الطلبات", path: "orders", icon: <BsCart3 />, count: "orders" },
      { label: "Credits", ar: "الكريدت", path: "credits", icon: <BsCoin />, count: "credits" },
    ],
  },
  {
    title: ["Our works", "شغلنا"],
    items: [
      { label: "Items", ar: "القطع", path: "items", icon: <BsBoxSeam /> },
      { label: "Categories", ar: "الفئات", path: "category", icon: <BsGrid /> },
      { label: "Types", ar: "الأنواع", path: "types", icon: <BsListUl /> },
      { label: "Models", ar: "الموديلات", path: "models", icon: <BsBoxes /> },
      { label: "Brands", ar: "الماركات", path: "brands", icon: <BsTags /> },
      { label: "Carousel", ar: "الصور المتحركة", path: "carousel", icon: <BsImages /> },
    ],
  },
  {
    title: ["Studio", "الاستوديو"],
    items: [
      { label: "Studio Pricing", ar: "تسعير الاستوديو", path: "pricing", icon: <BsCurrencyDollar /> },
      { label: "Colors", ar: "الألوان", path: "colors", icon: <BsDisc /> },
    ],
  },
  {
    title: ["Site", "الموقع"],
    items: [{ label: "System", ar: "النظام", path: "system", icon: <BsActivity />, count: "errors" }],
  },
];
const ALL_ITEMS = ADMIN_MENU.flatMap((g) => g.items);

// narrow screens start with the icon-only sidebar; the choice is remembered
function initialOpen() {
  try {
    const saved = localStorage.getItem("adminSidebar");
    if (saved === "open" || saved === "closed") return saved === "open";
  } catch {}
  return window.innerWidth >= 992;
}

function AdminLayout() {
  const location = useLocation();
  const { tx } = useLang();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const summary = useAdminSummary(true);

  useEffect(() => {
    try { localStorage.setItem("adminSidebar", isOpen ? "open" : "closed"); } catch {}
  }, [isOpen]);

  const segment = location.pathname.replace(/\/+$/, "").split("/")[2] || "";
  const current = ALL_ITEMS.find((x) => x.path === segment);

  return (
    <div className={`admin-wrapper ${isOpen ? "is-open" : "is-closed"}`}>
      <aside className="admin-sidebar" aria-label={tx("Admin menu", "قائمة الإدارة")}>
        <div className="admin-sidebar-head">
          {isOpen && <strong className="admin-sidebar-title">{tx("Admin", "الإدارة")}</strong>}
          <button
            type="button"
            className="admin-collapse"
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            aria-label={isOpen ? tx("Collapse menu", "صغّر القائمة") : tx("Expand menu", "كبّر القائمة")}
            title={isOpen ? tx("Collapse menu", "صغّر القائمة") : tx("Expand menu", "كبّر القائمة")}
          >
            <BsChevronLeft size={16} className={`flip-rtl admin-collapse-icon ${isOpen ? "" : "is-closed"}`} />
          </button>
        </div>

        <nav className="admin-nav">
          {ADMIN_MENU.map((group) => (
            <div key={group.title[0]} className="admin-nav-group">
              {isOpen ? <div className="admin-nav-title">{tx(group.title[0], group.title[1])}</div> : <hr className="admin-nav-sep" />}
              {group.items.map(({ label, ar, path, icon, count }) => {
                const name = tx(label, ar);
                const waiting = count ? summary[count] || 0 : 0;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`admin-nav-item ${segment === path ? "active" : ""}`}
                    aria-current={segment === path ? "page" : undefined}
                    title={isOpen ? undefined : name}
                  >
                    <span className="admin-nav-icon">
                      {icon}
                      {!isOpen && waiting > 0 && <span className="admin-dot" />}
                    </span>
                    {isOpen && <span className="admin-nav-label">{name}</span>}
                    {isOpen && waiting > 0 && (
                      <span className="admin-count" title={tx("Waiting for review", "بانتظار المراجعة")}>{waiting}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-page-head">
          <h1 className="admin-page-title">
            {current ? <>{current.icon} {tx(current.label, current.ar)}</> : tx("Admin", "الإدارة")}
          </h1>
        </header>
        <div className="admin-page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
