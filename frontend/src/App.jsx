import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import { ABI, CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from "./contract.js";

const SCAN = "https://sepolia.etherscan.io";
const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const statusOf = (e, now) => (now < e.start ? "Upcoming" : now > e.end ? "Closed" : "Open");
const badge = { Open: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30", Closed: "bg-slate-400/15 text-slate-300 ring-slate-400/30", Upcoming: "bg-amber-400/15 text-amber-300 ring-amber-400/30" };
// one colour per candidate: [bar gradient, avatar bg]
const PALETTE = [["from-indigo-400 to-violet-500", "bg-indigo-500"], ["from-cyan-400 to-sky-500", "bg-cyan-500"], ["from-pink-400 to-rose-500", "bg-pink-500"], ["from-amber-400 to-orange-500", "bg-amber-500"], ["from-emerald-400 to-teal-500", "bg-emerald-500"]];
const grad = "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:brightness-110";
const card = "rounded-2xl bg-white/5 border border-white/10 backdrop-blur";

function timeLeft(end, now) {
  const s = end - now;
  if (s <= 0) return "Ended";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m left`;
}

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-indigo-500/40">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></svg>
    </div>
    <span className="text-lg font-extrabold tracking-tight">BlockVote</span>
  </div>
);

export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [admin, setAdmin] = useState("");
  const [elections, setElections] = useState([]);
  const [picked, setPicked] = useState({});
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    window.ethereum?.on?.("accountsChanged", () => window.location.reload());
    window.ethereum?.on?.("chainChanged", () => window.location.reload());
  }, []);

  const load = useCallback(async (c, acct) => {
    setLoading(true);
    const n = Number(await c.electionCount());
    const list = await Promise.all(Array.from({ length: n }, async (_, i) => {
      const [e, cands, voted] = await Promise.all([c.getElection(i), c.getCandidates(i), c.hasVoted(i, acct)]);
      return { id: i, title: e.title, cid: e.ipfsCid, start: Number(e.start), end: Number(e.end), total: Number(e.totalVotes), voted,
        cands: cands.map((x) => ({ name: x.name, votes: Number(x.votes) })) };
    }));
    setElections(list.reverse()); setLoading(false);
  }, []);

  async function connect() {
    if (!window.ethereum) return setToast({ type: "error", text: "MetaMask not found. Install the extension to continue." });
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const acct = await signer.getAddress();
      const c = new Contract(CONTRACT_ADDRESS, ABI, signer);
      setAccount(acct); setContract(c); setAdmin((await c.admin()).toLowerCase());
      await load(c, acct);
    } catch (err) { setLoading(false); setToast({ type: "error", text: err.shortMessage || err.message }); }
  }

  async function tx(fn, okText) {
    setBusy(true); setToast({ type: "info", text: "Confirm the transaction in MetaMask…" });
    try {
      const t = await fn();
      setToast({ type: "info", text: "Transaction sent. Waiting for confirmation…", hash: t.hash });
      await t.wait(); await load(contract, account);
      setToast({ type: "success", text: okText, hash: t.hash }); return true;
    } catch (err) { setToast({ type: "error", text: err.reason || err.shortMessage || err.message }); return false; }
    finally { setBusy(false); }
  }

  const isAdmin = account && account.toLowerCase() === admin;
  const open = elections.filter((e) => statusOf(e, now) === "Open").length;
  const votes = elections.reduce((s, e) => s + e.total, 0);
  const stats = [["Elections", elections.length, "from-indigo-400 to-violet-400"], ["Open now", open, "from-emerald-300 to-cyan-400"], ["Votes recorded", votes, "from-pink-400 to-amber-300"]];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-[#0a0e1f]/70 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />Sepolia</span>
            {account ? (
              <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 pl-3.5 pr-1.5 py-1.5 text-sm font-semibold">
                {short(account)}
                {isAdmin && <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs px-2 py-0.5">Admin</span>}
              </span>
            ) : (
              <button onClick={connect} className={`rounded-xl ${grad} px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition`}>Connect wallet</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        {!account ? <Landing onConnect={connect} /> : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
              {stats.map(([l, v, g]) => (
                <div key={l} className={`${card} p-4 sm:p-5`}>
                  <p className="text-sm text-slate-400">{l}</p>
                  <p className={`text-3xl sm:text-4xl font-extrabold mt-1 bg-gradient-to-r ${g} bg-clip-text text-transparent`}>{v}</p>
                </div>))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Elections</h2>
              {isAdmin && <button onClick={() => setShowForm(!showForm)} className={`rounded-xl ${grad} px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30`}>{showForm ? "Close" : "New election"}</button>}
            </div>

            {showForm && <CreateForm busy={busy} onCreate={async (a) => { if (await tx(() => contract.createElection(...a), "Election created.")) setShowForm(false); }} />}

            {loading && <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}</div>}
            {!loading && elections.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
                <p className="font-semibold">No elections yet</p>
                <p className="text-sm text-slate-400 mt-1">{isAdmin ? "Select New election to publish the first ballot." : "The admin hasn't published a ballot yet."}</p>
              </div>)}

            <div className="space-y-6">
              {elections.map((e) => {
                const s = statusOf(e, now), sel = picked[e.id], canVote = s === "Open" && !e.voted;
                const lead = Math.max(...e.cands.map((c) => c.votes));
                return (
                  <article key={e.id} className={`${card} shadow-xl shadow-black/20 overflow-hidden`}>
                    <div className="h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500" />
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold">{e.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {e.total} vote{e.total !== 1 && "s"} · {s === "Open" ? timeLeft(e.end, now) : `Ends ${new Date(e.end * 1000).toLocaleDateString()}`}
                          {e.cid && <> · <a className="text-cyan-300 font-medium hover:underline" href={`https://ipfs.io/ipfs/${e.cid}`} target="_blank" rel="noreferrer">View on IPFS</a></>}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge[s]}`}>{s}</span>
                    </div>
                    <ul className="px-3 sm:px-4 pb-3 space-y-2" role="radiogroup" aria-label={e.title}>
                      {e.cands.map((c, i) => {
                        const pct = e.total ? Math.round((c.votes / e.total) * 100) : 0, on = sel === i, [bar, av] = PALETTE[i % PALETTE.length];
                        return (
                          <li key={i}>
                            <button role="radio" aria-checked={on} disabled={!canVote || busy} onClick={() => setPicked({ ...picked, [e.id]: i })}
                              className={`w-full text-left rounded-xl border px-4 py-3 transition ${on ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,.2)]" : "border-white/10 bg-white/[.03] hover:bg-white/[.07]"} disabled:cursor-default`}>
                              <div className="flex items-center gap-3">
                                <span className={`h-10 w-10 rounded-full grid place-items-center text-xs font-bold text-white ${av}`}>{initials(c.name)}</span>
                                <span className="flex-1 font-semibold">{c.name}{e.total > 0 && c.votes === lead && s === "Closed" && <span className="ml-2 text-xs rounded-full bg-emerald-400/15 text-emerald-300 px-2 py-0.5">Winner</span>}</span>
                                <span className="text-sm text-slate-300 tabular-nums">{c.votes} · {pct}%</span>
                              </div>
                              <div className="mt-3 h-2 rounded-full bg-white/10"><div className={`h-2 rounded-full bg-gradient-to-r ${bar} transition-all duration-500`} style={{ width: pct + "%" }} /></div>
                            </button>
                          </li>);
                      })}
                    </ul>
                    <div className="px-5 sm:px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-400">{e.voted ? "Your vote is recorded on-chain." : canVote ? "Select a candidate, then cast your vote." : s === "Upcoming" ? "Voting hasn't started." : "Voting has closed."}</p>
                      {canVote && <button disabled={sel === undefined || busy} onClick={() => tx(() => contract.vote(e.id, sel), "Vote recorded.")}
                        className={`rounded-xl ${grad} px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:shadow-none transition`}>Cast vote</button>}
                      {e.voted && <span className="rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 px-3 py-1 text-xs font-semibold">Voted</span>}
                    </div>
                  </article>);
              })}
            </div>
          </>)}
      </main>

      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-5 text-sm text-slate-400 flex flex-wrap justify-between gap-2">
          <span>Every vote is a public transaction on Ethereum Sepolia.</span>
          <a className="font-medium text-cyan-300 hover:underline" href={`${SCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Audit the contract</a>
        </div>
      </footer>

      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 left-5 sm:left-auto sm:w-96 rounded-xl border bg-[#141a33] shadow-2xl p-4 flex gap-3 ${toast.type === "error" ? "border-red-400/40" : toast.type === "success" ? "border-emerald-400/40" : "border-white/15"}`}>
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toast.type === "error" ? "bg-red-400" : toast.type === "success" ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`} />
          <div className="flex-1 text-sm">
            <p className="font-medium break-words">{toast.text}</p>
            {toast.hash && <a className="text-cyan-300 hover:underline" href={`${SCAN}/tx/${toast.hash}`} target="_blank" rel="noreferrer">View transaction</a>}
          </div>
          {!busy && <button aria-label="Dismiss" onClick={() => setToast(null)} className="text-slate-400 hover:text-white">✕</button>}
        </div>)}
    </div>
  );
}

function Landing({ onConnect }) {
  const points = [["One wallet, one vote", "The contract rejects a second ballot from the same wallet.", "bg-indigo-500"], ["Public audit trail", "Every vote is a transaction anyone can verify on Etherscan.", "bg-cyan-500"], ["Results nobody can edit", "Votes live on Ethereum, not in a database an admin controls.", "bg-pink-500"]];
  const demo = [["Asha Rao", 46, "from-indigo-400 to-violet-500"], ["Vikram Shah", 33, "from-cyan-400 to-sky-500"], ["Meera Iyer", 21, "from-pink-400 to-rose-500"]];
  return (
    <section className="grid lg:grid-cols-2 gap-12 items-center py-6">
      <div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent">Elections anyone can verify.</h1>
        <p className="mt-6 text-lg text-slate-300 max-w-md">BlockVote records every ballot on the Ethereum blockchain, so results are permanent and publicly auditable.</p>
        <button onClick={onConnect} className={`mt-8 rounded-xl ${grad} px-7 py-3.5 font-semibold text-white shadow-xl shadow-indigo-500/40 transition`}>Connect wallet to vote</button>
        <p className="mt-3 text-sm text-slate-400">Requires MetaMask on the Sepolia test network.</p>
      </div>
      <div className="space-y-4">
        <div className={`${card} p-5 shadow-2xl shadow-indigo-500/10`}>
          <div className="flex justify-between items-center mb-4"><p className="font-bold">Sample ballot</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge.Open}`}>Open</span></div>
          {demo.map(([n, p, g]) => (<div key={n} className="mb-3 last:mb-0"><div className="flex justify-between text-sm mb-1.5"><span className="font-medium">{n}</span><span className="text-slate-300">{p}%</span></div><div className="h-2 rounded-full bg-white/10"><div className={`h-2 rounded-full bg-gradient-to-r ${g}`} style={{ width: p * 2 + "%" }} /></div></div>))}
        </div>
        {points.map(([t, d, c]) => (<div key={t} className={`${card} p-4 flex gap-4 items-start`}><span className={`mt-1 h-3 w-3 rounded-full shrink-0 ${c}`} /><div><p className="font-bold">{t}</p><p className="text-sm text-slate-400 mt-0.5">{d}</p></div></div>))}
      </div>
    </section>
  );
}

function CreateForm({ onCreate, busy }) {
  const [title, setTitle] = useState(""); const [names, setNames] = useState(""); const [cid, setCid] = useState(""); const [hours, setHours] = useState(24);
  const [err, setErr] = useState("");
  const f = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm placeholder:text-slate-500 focus:border-cyan-400";
  const L = ({ t, children }) => <label className="block"><span className="block text-sm font-semibold mb-1.5">{t}</span>{children}</label>;
  function submit() {
    const list = names.split(",").map((n) => n.trim()).filter(Boolean);
    if (!title.trim() || list.length < 2) return setErr("Enter a title and at least two candidates.");
    setErr(""); const start = Math.floor(Date.now() / 1000);
    onCreate([title.trim(), cid.trim(), list, start, start + Number(hours) * 3600]);
  }
  return (
    <div className={`${card} p-5 sm:p-6 mb-6 space-y-4`}>
      <L t="Election title"><input className={f} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Student council president 2026" /></L>
      <L t="Candidates (comma-separated)"><input className={f} value={names} onChange={(e) => setNames(e.target.value)} placeholder="Asha Rao, Vikram Shah, Meera Iyer" /></L>
      <div className="grid sm:grid-cols-2 gap-4">
        <L t="Voting duration (hours)"><input type="number" min="1" className={f} value={hours} onChange={(e) => setHours(e.target.value)} /></L>
        <L t="IPFS CID for description (optional)"><input className={f} value={cid} onChange={(e) => setCid(e.target.value)} placeholder="bafy…" /></L>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button disabled={busy} onClick={submit} className={`rounded-xl ${grad} px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50`}>Publish election</button>
    </div>
  );
}
