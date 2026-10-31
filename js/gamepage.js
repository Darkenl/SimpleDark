/* SimpleDark: compact info panel at the top of every library game page.
 * Left: header image. Middle: play time / last played / size. Right: snippet, developer,
 * publisher, franchise, release date and a Play/Install button that clicks Steam's own one. */
(function () {
    if (window.__sdGamePage) return;
    window.__sdGamePage = true;

    const W = window.opener || window;

    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const names = (list) => (list || []).map((x) => x.strName).filter(Boolean).join(", ");

    function fmtBytes(n) {
        n = Number(n) || 0;
        if (!n) return "";
        const u = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return n.toFixed(n < 10 && i > 0 ? 2 : i > 1 ? 1 : 0) + " " + u[i];
    }

    function fmtMinutes(m) {
        m = Number(m) || 0;
        if (m < 60) return m + (m === 1 ? " minute" : " minutes");
        const h = m / 60;
        return (h < 10 ? h.toFixed(1) : Math.round(h)) + " hours";
    }

    function fmtDate(rt) {
        if (!rt) return "";
        return new Date(rt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    function fmtLastPlayed(rt) {
        if (!rt) return "Never";
        const d = new Date(rt * 1000), now = new Date();
        const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
        if (days <= 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 7) return days + " days ago";
        return fmtDate(rt);
    }

    function currentAppId(header) {
        for (const img of header.querySelectorAll("img")) {
            const m = (img.getAttribute("src") || "").match(/\/(?:assets|apps|customimages)\/(\d+)\//);
            if (m) return Number(m[1]);
        }
        return null;
    }

    function getData(appid) {
        let data, ov;
        try { data = W.appDetailsStore.GetAppData(appid); } catch (e) { data = null; }
        try { ov = W.appStore.GetAppOverviewByAppID(appid); } catch (e) { ov = null; }
        return { data, ov };
    }

    // Description and developer/publisher data arrive a moment after the page opens,
    // so the panel is rebuilt whenever this changes.
    function signature(appid) {
        const { data, ov } = getData(appid);
        if (!data || !data.details) return "";
        const a = data.associationData || {};
        return [
            (data.descriptionsData || {}).strSnippet,
            names(a.rgDevelopers), names(a.rgPublishers), names(a.rgFranchises),
            ov && ov.rt_original_release_date,
            data.details.nPlaytimeForever, data.details.rtLastTimePlayed, data.details.lDiskUsageBytes,
        ].join("|");
    }

    function buildPanel(appid, header) {
        const { data, ov } = getData(appid);
        if (!data || !data.details) return null;

        const det = data.details, assoc = data.associationData || {}, desc = data.descriptionsData || {};
        const img = det.strStoreHeaderImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
        const installed = Number(det.lDiskUsageBytes) > 0;
        const size = installed ? det.lDiskUsageBytes : det.lDiskSpaceRequiredBytes;
        const release = ov && (ov.rt_original_release_date || ov.rt_steam_release_date);

        const stats = [
            ["Play Time", fmtMinutes(det.nPlaytimeForever)],
            ["Last Played", fmtLastPlayed(det.rtLastTimePlayed)],
            [installed ? "Size on Disk" : "Space Required", fmtBytes(size)],
        ].filter((s) => s[1]);

        const meta = [
            ["Developer", names(assoc.rgDevelopers) || det.strDeveloperName],
            ["Publisher", names(assoc.rgPublishers)],
            ["Franchise", names(assoc.rgFranchises)],
            ["Release Date", fmtDate(release)],
        ].filter((m) => m[1]);

        const el = document.createElement("div");
        el.id = "sd-hero";
        el.dataset.appid = appid;
        el.innerHTML = `
            <div class="sd-hero-img"><img src="${esc(img)}" onerror="this.style.visibility='hidden'"></div>
            <div class="sd-hero-stats">
                ${stats.map(([k, v]) => `<div class="sd-stat"><div class="sd-stat-k">${esc(k)}</div><div class="sd-stat-v">${esc(v)}</div></div>`).join("")}
            </div>
            <div class="sd-hero-info">
                ${desc.strSnippet ? `<div class="sd-snippet">${esc(desc.strSnippet)}</div>` : ""}
                <div class="sd-meta">
                    ${meta.map(([k, v]) => `<div class="sd-meta-row"><span class="sd-meta-k">${esc(k)}:</span><span class="sd-meta-v">${esc(v)}</span></div>`).join("")}
                </div>
            </div>
            <div class="sd-action"><button class="sd-play" type="button" disabled></button><button class="sd-links" type="button" aria-haspopup="menu" hidden>Links ▾</button></div>`;

        el.querySelector(".sd-play").addEventListener("click", () => {
            const real = document.querySelector(".AppDetailsOverviewPanel .PlayButton") || document.querySelector(".PlayButton");
            if (real && !el.querySelector(".sd-play").disabled) real.click();
        });
        el.querySelector(".sd-links").addEventListener("click", (event) => {
            const handler = nativeLinksHandler();
            if (!handler) return;
            // Steam's existing menu callback anchors its popup to currentTarget.
            // Supply the card button without moving any React-owned nodes.
            const anchoredEvent = new Proxy(event, {
                get(target, key) {
                    if (key === "currentTarget" || key === "target") return event.currentTarget;
                    const value = Reflect.get(target, key, target);
                    return typeof value === "function" ? value.bind(target) : value;
                }
            });
            handler(anchoredEvent);
        });
        return el;
    }

    function nativeLinksHandler() {
        const native = document.querySelector(".AppDetailsOverviewPanel ._3-V8vjmrwuJM6Ws3tsjFJj ._1bIMOmWaxKrMdVMWU21ku");
        if (!native) return null;
        const key = Object.keys(native).find((key) => key.startsWith("__reactProps$"));
        const props = key && native[key];
        return props && (typeof props.onClick === "function" ? props.onClick : typeof props.onContextMenu === "function" ? props.onContextMenu : null);
    }

    function syncCardLinks(panel) {
        const button = panel.querySelector(".sd-links");
        if (!button) return;
        const ready = !!nativeLinksHandler();
        button.hidden = !ready;
        panel.dataset.linksReady = String(ready);
    }

    function syncButton(panel) {
        const real = document.querySelector(".AppDetailsOverviewPanel .PlayButton") || document.querySelector(".PlayButton");
        const btn = panel.querySelector(".sd-play");
        if (!btn) return;
        const label = real ? (real.textContent || "").trim() : "";
        const ready = !!real && !!label;
        panel.dataset.actionReady = String(ready);
        btn.disabled = !ready || real.matches(":disabled, [aria-disabled='true'], .Disabled") || !!real.querySelector("button:disabled, [aria-disabled='true']");
        if (btn.textContent !== label) btn.textContent = label;
        if (label && btn.getAttribute("aria-label") !== label) btn.setAttribute("aria-label", label);
    }

    // Hide only the requested game-page sections, including their headings.
    function hideCompactSections() {
        const hiddenLabels = /^(?:my review|your review|recordings and screenshots|recordings & screenshots|screenshots|steam workshop|workshop|trading cards|notes|achievements)$/i;
        for (const section of document.querySelectorAll(
            ".AppDetailsOverviewPanel ._2r4TK4BAuU-J4FuF_O7v_5, .AppDetailsOverviewPanel .AppDetailsSection"
        )) {
            const labelIds = (section.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
            const label = labelIds.map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
            section.classList.toggle("sd-hidden-game-section", hiddenLabels.test(label));
        }
    }

    function compactNavigationIcons() {
        const buttons = document.querySelectorAll(".TopBar > .SuperNavBar ._19axKcqYRuaJ8vdYKYmtTQ");
        const icons = ["store", "library", "community", "profile"];
        buttons.forEach((button, index) => {
            if (!icons[index]) return;
            const label = (button.textContent || "").trim();
            if (button.dataset.sdNavIcon !== icons[index]) button.dataset.sdNavIcon = icons[index];
            if (label && button.title !== label) button.title = label;
            if (label && button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
        });
    }

    let pending = false;
    function update() {
        pending = false;
        hideCompactSections();
        compactNavigationIcons();
        for (const button of document.querySelectorAll(".AppDetailsOverviewPanel ._3-V8vjmrwuJM6Ws3tsjFJj ._1bIMOmWaxKrMdVMWU21ku")) {
            if (button.getAttribute("aria-label") !== "Links") button.setAttribute("aria-label", "Links");
            if (button.title !== "Links") button.title = "Links";
        }
        const header = document.querySelector(".AppDetailsMain .Header");
        if (!header) return;
        const appid = currentAppId(header);
        let panel = document.getElementById("sd-hero");
        if (!appid) return;
        const sig = signature(appid);
        if (!panel || Number(panel.dataset.appid) !== appid || panel.dataset.sig !== sig || panel.parentNode !== header.parentNode) {
            if (panel) panel.remove();
            panel = buildPanel(appid, header);
            if (!panel) return;
            panel.dataset.sig = sig;
            header.parentNode.insertBefore(panel, header);
        }
        syncButton(panel);
        syncCardLinks(panel);
    }

    new MutationObserver(() => {
        if (!pending) { pending = true; requestAnimationFrame(update); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(update, 1000);
    update();
})();
