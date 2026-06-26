"use client";

import { useState, useMemo, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { ABI, CONTRACT_ADDRESS, EXPIRING_SOON_DAYS } from "../lib/contract";

const SUFFIX = ".bit";
const DAY = 86400;
const GRACE_DAYS = 30;
const FEE_ETH = "0.001";

// Demo mode runs with a local mock registry when no real contract is set,
// so the UI and all four states are fully testable before deploying.
const DEMO =
  !CONTRACT_ADDRESS ||
  CONTRACT_ADDRESS.toLowerCase() === "0xyourdeployedcontractaddress";

const YOU = "0xYou0a1b2c3d4e5f60718293a4b5c6d7e8f90Demo";

const nowSec = () => Math.floor(Date.now() / 1000);
const daysLeft = (ts) => Math.floor((Number(ts) - nowSec()) / DAY);
const short = (a) =>
  !a || a === "0x0000000000000000000000000000000000000000"
    ? "—"
    : a.slice(0, 6) + "…" + a.slice(-4);

function computeStatus(available, owner, expiresAt) {
  if (available || !owner || owner === "0x0000000000000000000000000000000000000000")
    return "available";
  if (nowSec() > Number(expiresAt)) return "grace";
  if (daysLeft(expiresAt) <= EXPIRING_SOON_DAYS) return "expiring";
  return "taken";
}

const STATUS_META = {
  available: { label: "Available", cls: "green" },
  taken: { label: "Taken", cls: "rose" },
  expiring: { label: "Expiring soon", cls: "amber" },
  grace: { label: "In grace period", cls: "amber" },
};

const baseContract = { address: CONTRACT_ADDRESS, abi: ABI };

export default function Home() {
  const [view, setView] = useState("landing"); // 'landing' | 'app'
  const [heroInput, setHeroInput] = useState("");

  function launch(prefill) {
    if (prefill) setHeroInput(prefill);
    setView("app");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  return view === "landing" ? (
    <Landing onLaunch={launch} heroInput={heroInput} setHeroInput={setHeroInput} />
  ) : (
    <App onHome={() => setView("landing")} initialQuery={heroInput} />
  );
}

/* ------------------------------------------------------------------ */
/* Landing                                                             */
/* ------------------------------------------------------------------ */
function Landing({ onLaunch, heroInput, setHeroInput }) {
  return (
    <div className="page">
      <nav className="nav">
        <div className="logo">
          <span className="logo-mark">◈</span> Nymora
        </div>
        <button className="btn btn-primary" onClick={() => onLaunch()}>
          Launch app
        </button>
      </nav>

      <header className="hero">
        <span className="eyebrow">● Live on Ethereum Sepolia</span>
        <h1 className="hero-title">
          Claim your name.
          <br />
          <span className="grad">Onchain forever.</span>
        </h1>
        <p className="hero-sub">
          Trade the unreadable wallet address for a name people actually
          remember. Register it, point it at your wallet, renew it yearly — all
          onchain, owned by you.
        </p>

        <div className="hero-search">
          <div className="hs-field">
            <input
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              placeholder="yourname"
              onKeyDown={(e) => e.key === "Enter" && onLaunch(heroInput)}
            />
            <span className="hs-suffix">{SUFFIX}</span>
          </div>
          <button className="btn btn-primary" onClick={() => onLaunch(heroInput)}>
            Search names →
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-num">.bit</span>
            <span className="stat-label">your handle</span>
          </div>
          <div className="stat">
            <span className="stat-num">1&nbsp;yr</span>
            <span className="stat-label">lease, renewable</span>
          </div>
          <div className="stat">
            <span className="stat-num">100%</span>
            <span className="stat-label">onchain</span>
          </div>
        </div>
      </header>

      <section className="section">
        <h2 className="sec-title">Every name has a clear status</h2>
        <p className="sec-sub">
          Nymora always tells you exactly where a name stands — at a glance.
        </p>
        <div className="state-grid">
          <StateCard
            name="nymora.bit"
            status="available"
            note="Free to register right now."
          />
          <StateCard
            name="vitalik.bit"
            status="taken"
            note="Owned, lease active."
          />
          <StateCard
            name="satoshi.bit"
            status="expiring"
            note="Renew within 30 days or lose it."
          />
          <StateCard
            name="bitnob.bit"
            status="grace"
            note="Expired — owner's last chance to renew."
          />
        </div>
      </section>

      <section className="section">
        <h2 className="sec-title">Why Nymora</h2>
        <div className="feat-grid">
          <Feature
            icon="✦"
            title="Readable names"
            body="Send and receive as alice.bit instead of a 42-character hex string."
          />
          <Feature
            icon="⟳"
            title="Lease & renew"
            body="Hold a name for a year for a small fee, then renew to keep it yours."
          />
          <Feature
            icon="◔"
            title="Lapse warnings"
            body="Nymora watches your names and warns you before any of them expire."
          />
        </div>
      </section>

      <section className="section steps">
        <h2 className="sec-title">How it works</h2>
        <ol className="step-list">
          <li>
            <span className="step-n">1</span>
            <div>
              <h3>Search a name</h3>
              <p>Type any name and see instantly if it's available.</p>
            </div>
          </li>
          <li>
            <span className="step-n">2</span>
            <div>
              <h3>Register it</h3>
              <p>Pay the small fee and the name is yours for a year, pointed at your wallet.</p>
            </div>
          </li>
          <li>
            <span className="step-n">3</span>
            <div>
              <h3>Renew before it lapses</h3>
              <p>Keep it forever by renewing — or let it return to the pool.</p>
            </div>
          </li>
        </ol>
        <button className="btn btn-primary btn-lg" onClick={() => onLaunch()}>
          Launch the app →
        </button>
      </section>

      <footer className="foot">
        Nymora · a decentralized name registry · running on Ethereum Sepolia
      </footer>
    </div>
  );
}

function StateCard({ name, status, note }) {
  const meta = STATUS_META[status];
  return (
    <div className="state-card">
      <div className="state-top">
        <span className="state-name">{name}</span>
        <span className={`pill pill-${meta.cls}`}>{meta.label}</span>
      </div>
      <p className="state-note">{note}</p>
    </div>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div className="feat-card">
      <span className="feat-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
function App({ onHome, initialQuery }) {
  const { address, isConnected } = useAccount();
  const [input, setInput] = useState(initialQuery || "");
  const [query, setQuery] = useState(initialQuery || "");
  const [toast, setToast] = useState("");

  // demo registry seeded with examples covering every state
  const [demo, setDemo] = useState(() => ({
    vitalik: { owner: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", resolved: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", expiresAt: nowSec() + 210 * DAY },
    satoshi: { owner: "0x1A2b3C4d5E6f70819A2B3c4D5e6F7081A2b3C4d5", resolved: "0x1A2b3C4d5E6f70819A2B3c4D5e6F7081A2b3C4d5", expiresAt: nowSec() + 9 * DAY },
    bitnob: { owner: "0x9F3c2A1b4D5e6F70819a2b3C4d5E6f7081A2B3c4", resolved: "0x9F3c2A1b4D5e6F70819a2b3C4d5E6f7081A2B3c4", expiresAt: nowSec() - 4 * DAY },
    adesewa: { owner: YOU, resolved: YOU, expiresAt: nowSec() + 12 * DAY },
  }));

  const label = query.trim().toLowerCase();

  // ---- live reads (only when a real contract is configured) ----
  const { data: feeData } = useReadContract({
    ...baseContract,
    functionName: "registrationFee",
    query: { enabled: !DEMO },
  });
  const { data: reads, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...baseContract, functionName: "available", args: [label] },
      { ...baseContract, functionName: "getRecord", args: [label] },
    ],
    query: { enabled: !DEMO && !!label },
  });

  const fee = DEMO ? null : feeData;
  const feeLabel = DEMO ? FEE_ETH : fee !== undefined ? formatEther(fee) : "…";

  // ---- resolve current name into a common shape ----
  const result = useMemo(() => {
    if (!label) return null;
    if (DEMO) {
      const rec = demo[label];
      const available =
        !rec || nowSec() > Number(rec.expiresAt) + GRACE_DAYS * DAY;
      const owner = rec?.owner;
      return {
        available,
        owner,
        resolved: rec?.resolved,
        expiresAt: rec?.expiresAt,
        status: computeStatus(available, owner, rec?.expiresAt),
        isOwner: rec?.owner === YOU,
      };
    }
    if (!reads) return { loading: true };
    const available = reads[0]?.result;
    const r = reads[1]?.result || [];
    const [owner, resolved, expiresAt] = r;
    return {
      available,
      owner,
      resolved,
      expiresAt,
      status: computeStatus(available, owner, expiresAt),
      isOwner: owner && address && owner.toLowerCase() === address.toLowerCase(),
    };
  }, [label, demo, reads, address]);

  // ---- writes ----
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  useEffect(() => {
    if (isSuccess) {
      setToast("✓ Confirmed onchain");
      refetch();
    }
  }, [isSuccess, refetch]);

  const busy = isPending || isConfirming;

  function doSearch(e) {
    e?.preventDefault();
    reset?.();
    setToast("");
    setQuery(input);
  }

  function clearSearch() {
    setInput("");
    setQuery("");
    setToast("");
    reset?.();
  }

  function register() {
    if (DEMO) {
      setDemo((d) => ({
        ...d,
        [label]: { owner: YOU, resolved: YOU, expiresAt: nowSec() + 365 * DAY },
      }));
      setToast(`✓ ${label}${SUFFIX} registered (demo)`);
      return;
    }
    writeContract({ ...baseContract, functionName: "register", args: [label], value: fee });
  }

  function renew(name) {
    if (DEMO) {
      setDemo((d) => {
        const cur = d[name];
        const base = Math.max(nowSec(), Number(cur?.expiresAt || 0));
        return { ...d, [name]: { ...cur, owner: cur?.owner || YOU, resolved: cur?.resolved || YOU, expiresAt: base + 365 * DAY } };
      });
      setToast(`✓ ${name}${SUFFIX} renewed (demo)`);
      return;
    }
    writeContract({ ...baseContract, functionName: "renew", args: [name], value: fee });
  }

  const myNames = DEMO
    ? Object.keys(demo).filter((k) => demo[k].owner === YOU)
    : [];

  return (
    <div className="page app-page">
      <nav className="nav">
        <button className="logo logo-btn" onClick={onHome}>
          <span className="logo-mark">◈</span> Nymora
        </button>
        <div className="nav-right">
          {DEMO && <span className="demo-badge">Demo mode</span>}
          {!DEMO && <ConnectButton showBalance={false} chainStatus="icon" />}
        </div>
      </nav>

      <div className="app-body">
        <h1 className="app-h1">Find your name</h1>
        <p className="app-sub">
          {DEMO
            ? "You're in demo mode — try the names below to see every state, and register a free one."
            : "Search a name, then register or renew it onchain."}
        </p>

        <form onSubmit={doSearch} className="search-bar">
          <div className="sb-field">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="search a name"
              autoComplete="off"
            />
            <span className="sb-suffix">{SUFFIX}</span>
          </div>
          <button type="submit" className="btn btn-primary">
            Check
          </button>
          {(input || query) && (
            <button type="button" className="btn btn-ghost" onClick={clearSearch}>
              Clear
            </button>
          )}
        </form>

        {DEMO && (
          <div className="try-row">
            <span>Try:</span>
            {["nymora", "vitalik", "satoshi", "bitnob"].map((n) => (
              <button
                key={n}
                className="chip"
                onClick={() => {
                  setInput(n);
                  setQuery(n);
                  setToast("");
                }}
              >
                {n}.bit
              </button>
            ))}
          </div>
        )}

        {label && result && (
          <div className="result">
            {result.loading || isLoading ? (
              <p className="muted">Checking the blockchain…</p>
            ) : (
              <>
                <div className="result-top">
                  <span className="result-name">
                    {label}
                    {SUFFIX}
                  </span>
                  <span className={`pill pill-${STATUS_META[result.status].cls}`}>
                    {STATUS_META[result.status].label}
                  </span>
                </div>

                {result.status === "available" ? (
                  <>
                    <p className="muted">This name is free. Claim it.</p>
                    <button
                      className="btn btn-primary full"
                      onClick={register}
                      disabled={busy || (!DEMO && !isConnected)}
                    >
                      {busy ? "Confirming…" : `Register · ${feeLabel} ETH / yr`}
                    </button>
                    {!DEMO && !isConnected && (
                      <p className="hint">Connect your wallet to register.</p>
                    )}
                  </>
                ) : (
                  <div className="kv-list">
                    <Row k="Owner" v={short(result.owner)} />
                    <Row k="Points to" v={short(result.resolved)} />
                    <Row
                      k="Expires"
                      v={result.expiresAt ? new Date(Number(result.expiresAt) * 1000).toLocaleDateString() : "—"}
                    />
                    <Row
                      k="Days left"
                      v={result.expiresAt ? Math.max(daysLeft(result.expiresAt), 0) : "—"}
                    />
                    {result.status === "expiring" && (
                      <div className="banner amber">⚠ Expiring soon — renew to keep it.</div>
                    )}
                    {result.status === "grace" && (
                      <div className="banner rose">⏳ Lease lapsed. Only the owner can renew before it's released.</div>
                    )}
                    {result.isOwner && (
                      <button className="btn btn-primary full" onClick={() => renew(label)} disabled={busy}>
                        {busy ? "Confirming…" : `Renew · ${feeLabel} ETH`}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}

        {myNames.length > 0 && (
          <div className="mine">
            <h2>Your names</h2>
            <p className="muted small">Nymora warns you before these lapse.</p>
            {myNames.map((n) => {
              const d = daysLeft(demo[n].expiresAt);
              const warn = d <= EXPIRING_SOON_DAYS;
              return (
                <div key={n} className={`mine-row ${warn ? "warn" : ""}`}>
                  <div>
                    <span className="mine-name">{n}{SUFFIX}</span>
                    <span className="mine-meta">{d < 0 ? "Expired — renew now" : `${d} days left`}</span>
                  </div>
                  {warn && (
                    <button className="btn btn-sm" onClick={() => renew(n)} disabled={busy}>
                      Renew
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{String(v)}</span>
    </div>
  );
}
