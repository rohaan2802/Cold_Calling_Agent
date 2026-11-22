import CallHistory from "@/components/CallHistory";
import OutboundDialer from "@/components/OutboundDialer";
import TalkToAgent from "@/components/TalkToAgent";
import Link from "next/link";

const CAPABILITIES = [
  {
    title: "Live Call Agent",
    body: "Browser mic conversations with English / Urdu lock, idle checks, and hard hangup after goodbye.",
  },
  {
    title: "Outbound dialer",
    body: "Real US (+1) phone calls through your VAPI number when you want a full telephony check.",
  },
  {
    title: "Permanent archive",
    body: "Recordings + transcripts survive VAPI’s ~14-day free retention via GitHub / static hosting.",
  },
  {
    title: "Demo Samples",
    body: "Web, outbound, and inbound scenarios with distinct voices — zero credits, stay until you delete.",
  },
  {
    title: "History tools",
    body: "Search, filters, stats, CSV export, seekable playback, and one-click transcript copy.",
  },
  {
    title: "Auto sync path",
    body: "End-of-call webhook + hourly GitHub Action pull recordings; manual pull when you want it now.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero" id="demo">
        <p className="eyebrow">AI voice sales · Production-ready demo</p>
        <p className="hero-brand">Vantora</p>
        <h1>Alex — outbound voice agent that handles objections like a closer</h1>
        <p className="lede">
          Talk in the browser, dial real numbers, and keep every recording with transcript in a
          permanent archive. English and Urdu stay locked per call so conversations stay clean.
        </p>
        <div className="hero-actions">
          <a href="#talk" className="action-btn primary">
            Start Call Agent
          </a>
          <a href="#history" className="action-btn">
            Call History
          </a>
          <a href="#outbound" className="action-btn">
            Outbound Dialer
          </a>
        </div>
      </section>

      <section className="panel product-guide" id="how-it-works">
        <p className="eyebrow">Capability set</p>
        <h2>Everything included</h2>
        <div className="capability-grid">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="capability">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="hint capability-tip">
          Tip: explore <Link href="/calls">Call History</Link> demos first if you want to save VAPI
          credits — then run a short live Call Agent session.
        </p>
      </section>

      <div className="grid-2">
        <div id="talk">
          <TalkToAgent />
        </div>
        <div id="outbound">
          <OutboundDialer />
        </div>
      </div>

      <CallHistory />
    </main>
  );
}
