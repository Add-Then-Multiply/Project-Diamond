"""Generate an eight-statement self-assessment page from pitch.html as the
structural base. Each instrument keeps the shared engine (six stream
statements plus the two common ones, the routing, the written report and the
runTests harness) and supplies its own copy, statements, actions and plan.

Run from the repo root: python3 tools/new_instrument.py
"""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = (ROOT / "pitch.html").read_text(encoding="utf-8")

COMMON = [
  {"kind": "case", "text": "We have a clear, written business case that a stranger could follow."},
  {"kind": "revenue", "text": "Our revenue is predictable enough to forecast the next twelve months with confidence."},
]

def page(cfg):
    s = BASE
    s = re.sub(r"<title>.*?</title>", "<title>" + cfg["title"] + "</title>", s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + cfg["description"] + '">', s, count=1)
    # The base page's opening kicker carries the "rise" class; start there, so none of the
    # Pitching introduction survives above the new instrument's own copy.
    start = s.index('<span class="kicker rise">'); end = s.index('<h2 id="assess">')
    s = s[:start] + cfg["copy"] + s[end:]
    for old, new in [
        ('<h2 id="assess">Pitching self-assessment', '<h2 id="assess">' + cfg["stream"] + ' self-assessment'),
        ("Six statements measure your pitch;", "Six statements measure " + cfg["noun"] + ";"),
        ('onclick="scoreAssessment()">Score my pitch</button>', 'onclick="scoreAssessment()">' + cfg["button"] + '</button>'),
        ("Add Then Multiply · Pitching self-assessment report", "Add Then Multiply · " + cfg["stream"] + " self-assessment report"),
        ('const ASSESSMENT = "PI";', 'const ASSESSMENT = "' + cfg["code"] + '";'),
        ('const STREAM_NAME = "Pitching";', 'const STREAM_NAME = "' + cfg["stream"] + '";'),
    ]:
        assert old in s, (cfg["file"], old)
        s = s.replace(old, new)
    s = re.sub(r'(<h2>Book a Readiness Call</h2>\n<p class="body">).*?(</p>)', lambda m: m.group(1) + cfg["cta_text"] + m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'<p class="note">.*?</p>\n</main>', '<p class="note">' + cfg["note"] + '</p>\n</main>', s, count=1, flags=re.S)
    s = re.sub(r'/\* ---- Pitching self-assessment -{10,}', "/* ---- " + cfg["stream"] + " self-assessment ----------------------------------------", s, count=1)
    stmts = [{"kind": "stream", "text": t} for t in cfg["statements"]] + COMMON
    s = re.sub(r"const STATEMENTS = \[.*?\];\n", "const STATEMENTS = " + json.dumps(stmts, ensure_ascii=False) + ";\n", s, count=1, flags=re.S)
    routes_js = "const ROUTES = {\n" + ",\n".join(
        f'  {k}: {{ title: {json.dumps(v["title"], ensure_ascii=False)},\n    text: {json.dumps(v["text"], ensure_ascii=False)},\n    links: {json.dumps(v["links"])} }}' for k, v in cfg["routes"].items()) + "\n};\n"
    s = re.sub(r"const ROUTES = \{.*?\n\};\n", routes_js, s, count=1, flags=re.S)
    s = re.sub(r"const ACTIONS = \[.*?\];\n", "const ACTIONS = " + json.dumps(cfg["actions"], ensure_ascii=False) + ";\n", s, count=1, flags=re.S)
    s = re.sub(r"const PLAN = \{.*?\};\n", "const PLAN = " + json.dumps(cfg["plan"], ensure_ascii=False) + ";\n", s, count=1, flags=re.S)
    s = re.sub(r'ASSESSMENT === "PI"\);', 'ASSESSMENT === "' + cfg["code"] + '");', s, count=1)
    s = re.sub(r'planFor\("programme"\)\.entry === \d\);', 'planFor("programme").entry === ' + str(cfg["plan"]["programme"][0]) + ');', s, count=1)
    # Three harness lines bake in facts about the Pitching page; generated pages carry their own routes and plans.
    s = re.sub(r'  t\("call route links to both free diagnostics", [^\n]*\n', '  t("call route links to at least two pages, one of them a diagnostic", ROUTES.call.links.length >= 2 && ROUTES.call.links.every(l => /\\.html$/.test(l[0])) && ROUTES.call.links.some(l => /diagnostic|investor-ready|transaction-readiness/.test(l[0])));\n', s, count=1)
    s = re.sub(r'  t\("plan for the call route names the two diagnostics at step 01", [^\n]*\n', '  t("plan for the call route sits at step 01 and names a diagnostic", /Diagnostic|Scorecard|Exit Ready|Transaction Readiness/.test(planFor("call").name) && planFor("call").entry === 1);\n', s, count=1)
    s = re.sub(r'  t\("programme and finance plans use the 90-day sprint framing", [^\n]*\n', '  t("the finance plan uses the 90-day sprint framing", /90-day/.test(PLAN.finance[2]));\n', s, count=1)
    assert "A story that agrees with the numbers" not in s[:s.index('<h2 id="assess">')], (cfg["file"], "Pitching intro left in")
    for bad in ["Key Person", "Priestley", "Dent", "product.html", "publish.html", "—"]:
        assert bad not in s, (cfg["file"], bad)
    (ROOT / cfg["file"]).write_text(s, encoding="utf-8")
    print("generated", cfg["file"], "code", cfg["code"])

BOUNDARY = "One line we do not cross: Add Then Multiply does not arrange investments or publish financial promotions. We help you {verb}; where a client raises money or sells, David leads that work as an officer of the client company, for and on behalf of that company."
NOTE = "This page describes advisory services and is not a financial promotion. Add Then Multiply is not authorised or regulated by the Financial Conduct Authority and does not arrange investments. Where a client raises money, buys or sells a business, David leads that work as an officer of the client company, for and on behalf of that company. Methodology: FACE (Fund, Acquire, Consolidate, Exit) from <em>Add Then Multiply</em> by David B Horne."

FOUNDER_DEPENDENCE = {
 "file": "founder-dependence.html", "code": "FD", "stream": "Founder Dependence", "noun": "how far the business depends on you", "button": "Score my founder dependence",
 "title": "Founder Dependence · Add Then Multiply",
 "description": "The Founder Dependence self-assessment: how much of the business only works because you are in it, and the single largest discount a buyer applies. Free, eight statements, a written report on the page.",
 "copy": """<span class="kicker">Founder Dependence · the Consolidate phase of FACE · feeds Exit</span>
<h1>Would the business notice if you took three months off?</h1>
<p class="lede">Most founder-led businesses have one asset a buyer cannot buy: the founder. The customers who only deal with you, the know-how in your head, the decisions that stop at your desk, the revenue that arrives because you sold it. Every one of those is a discount at exit and a ceiling before it. This self-assessment measures how far the business depends on you, and tells you which dependence to remove first.</p>
<p style="font-size:0.9rem;margin-top:0.6rem;"><a href="#assess"><b>Take the free ten-minute self-assessment ↓</b></a>. It tells you where the dependence sits, and what to do about it.</p>

<h2>Who this is for</h2>
<div class="grid3">
<div class="card"><h3>The founder who is still the best salesperson</h3><p>The biggest accounts are yours. That is a strength at £2 million and the largest single discount at £10 million.</p></div>
<div class="card"><h3>The founder every decision comes back to</h3><p>Pricing, hiring, spending, a difficult customer: all of it waits for you. The team is capable; the business is not designed to let them act.</p></div>
<div class="card"><h3>The founder two years from a sale</h3><p>A buyer will ask what happens on the day you leave. If the honest answer is "I do not know", the price already reflects it.</p></div>
</div>

<h2>The problem</h2>
<p class="body">Dependence is invisible from the inside because the founder fills the gaps without noticing. From the outside it is the first thing a buyer's advisers look for: which customers would follow you out, which processes exist only in your memory, who would run the business in the first hundred days, and whether the revenue was won by a system or by a person. The answers set the earn-out, the lock-in and the discount. Reducing dependence is the largest value lever most founders have, and the one that takes longest, which is why it belongs in the Consolidate phase, well before a sale is in view.</p>

<h2>What we do</h2>
<p class="body">Founder Dependence is not a service of its own. It is the diagnosis that points to the right one. Where the dependence is commercial, <a href="commercial-acceleration.html">Commercial Acceleration</a> builds the sales pathway and the people who run it. Where it is financial and operational, <a href="finance-advisory.html">Finance Advisory</a> puts a finance function and a management rhythm in place that does not need you in every meeting. Where it is about succession and the story, the <a href="roadmap.html">Personalised Roadmap</a> sequences the work so that a buyer meets a business, not a person.</p>
<p class="body">""" + BOUNDARY.format(verb="build a business that runs without you") + """</p>

<h2>What you walk away with</h2>
<ul class="walk">
<li><b>A dependence map.</b> Eight statements scored, the two that matter most named, and the order to tackle them in.</li>
<li><b>The line to your target.</b> How far you are from a business that could be sold as a business, and what closes the gap.</li>
<li><b>A suggested plan.</b> Which service removes which dependence, and where to start.</li>
</ul>

<h2>Where it fits</h2>
<p class="body">Founder Dependence sits in Consolidate, the C of FACE, because it is the work of making the business a machine rather than a performance. It feeds <a href="diagnostic.html">Exit</a> directly: the Multiplier Diagnostic scores the whole business, and the Transaction Readiness Assessment tests it at a buyer's depth; this instrument scores the one thing both of them assume, that the business is separable from you.</p>
<div class="stream">
<span class="kicker">The value stream this feeds</span>
<ol class="stream-steps">
  <li><a href="diagnostic.html">01 · Diagnostic<em>Free · the whole business</em></a></li>
  <li><a href="roadmap.html">02 · Personalised Roadmap<em>Dependence, sequenced out</em></a></li>
  <li><a href="finance-advisory.html">03 · Insourcing<em>Finance Advisory and Commercial Acceleration</em></a></li>
  <li><a href="readiness-project.html">04 · Readiness Project<em>A business, not a person, goes to market</em></a></li>
</ol>
</div>

<h2>Proof</h2>
<p class="body">"How small businesses can think like big businesses" is the whole of it: big businesses are built to outlast the people who run them. The discipline behind this instrument is the Consolidate phase of the FACE methodology in David B Horne's <em>Add Then Multiply</em>, and the buyer's lens on founder risk that every transaction he has led has had to answer.</p>
<p class="quote">"How small businesses can think like big businesses and achieve exponential growth." <em>Add Then Multiply</em>, David B Horne</p>

""",
 "cta_text": "The scope and the fee for whichever service the dependence points to are agreed on the Readiness Call, once we have seen your self-assessment.",
 "note": NOTE,
 "statements": [
  "The business could run for three months without me and nothing a customer would notice would change.",
  "Our largest customers have working relationships with people in the business other than me.",
  "The know-how that makes us good is written down and used by others, not carried in my head.",
  "Managers make pricing, hiring and spending decisions within limits I have set, without bringing them to me.",
  "More than half of our revenue renews or repeats without a new sale by me.",
  "There is a named person who could step into my role tomorrow, and the team would follow them.",
 ],
 "actions": [
  "Take two weeks off with your phone off and write down everything that broke. That list is the roadmap; the sprint works through it in order of value.",
  "Pair every top-ten account with a second relationship inside the business, and step out of the next three meetings with each of them.",
  "Write the operating manual for the three things only you know how to do, then watch someone else do them from the manual.",
  "Set decision limits in writing: what a manager may decide on price, hiring and spend without you, and review the exceptions monthly rather than the decisions daily.",
  "Move revenue onto renewal, retainer or repeat where the customer will accept it, and track the share of revenue that arrives without a new sale by you.",
  "Name your successor, tell them, and give them one part of the business to run end to end for a quarter.",
  "Write the business case down so a stranger could follow it. A business that depends on you usually has its case in your head too.",
  "Get a rolling twelve-month forecast in place that someone other than you owns. Finance Advisory's Financial Deep Dive is where that starts.",
 ],
 "routes": {
  "programme": {"title": "Where this points: Commercial Acceleration and Finance Advisory",
   "text": "Your business case and revenue hold up. The dependence is in the engine: the selling, the decisions and the know-how that still run through you. Commercial Acceleration builds the sales pathway and the people who run it; Finance Advisory puts a management rhythm in place that does not need you in every meeting. The Readiness Call decides which comes first.",
   "links": [["commercial-acceleration.html", "Commercial Acceleration"], ["finance-advisory.html", "Finance Advisory"]]},
  "finance": {"title": "Where this points: Finance Advisory first",
   "text": "Before the dependence can be designed out, the business case or the revenue behind it needs shoring up. We start there: a Financial Deep Dive, then an insourced finance function, so that the numbers stop depending on you before anything else does. Read about Finance Advisory, then book a Readiness Call.",
   "links": [["finance-advisory.html", "Finance Advisory"]]},
  "call": {"title": "Where this points: a Readiness Call, and probably a diagnostic",
   "text": "The business is largely separable from you, and the case and the revenue hold. The next step is likely the Funding Scorecard or Exit Ready, depending on what you want. Take either free diagnostic first, or go straight to the Readiness Call.",
   "links": [["investor-ready.html", "Funding Scorecard"], ["diagnostic.html", "Exit Ready"]]},
 },
 "plan": {
  "programme": [3, "Commercial Acceleration and Finance Advisory", "Reducing founder dependence runs through Insourcing: Commercial Acceleration for the selling and the sales pathway, Finance Advisory for the numbers and the management rhythm, each a 90-day sprint with the capability left in the business. Your entry point is Insourcing. Scope and fee are agreed on the Readiness Call."],
  "finance": [3, "Finance Advisory", "Finance Advisory starts with a Financial Deep Dive to establish the true position, then an insourced CFO or finance function on a 90-day sprint. Your entry point is Insourcing; the dependence work follows once the numbers stand on their own. Scope and fee are agreed on the Readiness Call."],
  "call": [1, "Funding Scorecard or Exit Ready", "Your next step is one of the two free diagnostics: the Funding Scorecard if you are raising, Exit Ready if you are selling, followed by the Personalised Roadmap. Book the Readiness Call and we will tell you which. Scope and fee for anything beyond the diagnostic are agreed on the call."],
 },
}

PERSONAL_EXIT = {
 "file": "personal-exit-readiness.html", "code": "PX", "stream": "Personal Exit Readiness", "noun": "how ready you are, personally, for an exit", "button": "Score my personal exit readiness",
 "title": "Personal Exit Readiness · Add Then Multiply",
 "description": "The Personal Exit Readiness self-assessment: the number, the life after it, the people who need to agree, and the deal you would walk away from. Free, eight statements, a written report on the page.",
 "copy": """<span class="kicker">Personal Exit Readiness · the Exit phase of FACE · Founder Clarity</span>
<h1>An exit is a life event. Are you ready for the life?</h1>
<p class="lede">Every exit process ATM has run starts with the same conversation, and it is not about the business. It is about the number you need, what you will do the Monday after completion, whether the people around you agree, and the deal you would refuse. Founders who have answered those questions set their own terms. Founders who have not take the market's. This self-assessment asks them before a buyer does.</p>
<p style="font-size:0.9rem;margin-top:0.6rem;"><a href="#assess"><b>Take the free ten-minute self-assessment ↓</b></a>. It tells you where your own readiness sits, separate from the business's.</p>

<h2>Who this is for</h2>
<div class="grid3">
<div class="card"><h3>The founder who has started to think about it</h3><p>Not selling yet, but the thought has arrived. This is the moment the personal plan is cheapest to build.</p></div>
<div class="card"><h3>The founder with co-owners or a family business</h3><p>A sale needs more than one person to agree, on the timing, the price and what happens to the people. Alignment found late is the most expensive kind.</p></div>
<div class="card"><h3>The founder who has been approached</h3><p>An offer has landed. Whether it is a good one depends on questions you may not yet have answered for yourself.</p></div>
</div>

<h2>The problem</h2>
<p class="body">Deals fall over on the founder more often than on the business. A number that turns out not to be enough once tax and the next twenty years are counted. A founder who cannot picture life without the business and starts to slow the process down without meaning to. Co-owners who never quite agreed. A structure accepted in the excitement of an offer that leaves the founder working for the buyer for three years. None of these show up in a data room, and every one of them costs more than any metric in it. Founder Clarity, the first phase of ATM's exit advisory process, exists to settle them first.</p>

<h2>What we do</h2>
<p class="body">Personal Exit Readiness is the Founder Clarity conversation, scored. It feeds the <a href="diagnostic.html">Multiplier Diagnostic</a>, which reads the business, and the <a href="roadmap.html">Personalised Roadmap</a>, which starts from your personal and financial goals and works backwards to what the business must become. Where the personal plan is the gap, the Readiness Call is where it gets built, with David and, where it helps, an independent financial planner of your choosing.</p>
<p class="body">""" + BOUNDARY.format(verb="decide what you want before anyone else decides for you") + """</p>

<h2>What you walk away with</h2>
<ul class="walk">
<li><b>Your own readiness, scored.</b> Eight statements on your personal readiness, separate from the business, and the two to settle first.</li>
<li><b>The line to your target.</b> What still needs an answer before you could say yes, or no, to an offer with confidence.</li>
<li><b>A suggested plan.</b> Founder Clarity first, then the diagnostic and the roadmap, in the order that protects the price.</li>
</ul>

<h2>Where it fits</h2>
<p class="body">This is the E of FACE from the founder's side. The <a href="diagnostic.html">Multiplier Diagnostic</a> scores the business; the <a href="transaction-readiness.html">Transaction Readiness Assessment</a> tests it at a buyer's depth; this instrument scores the person the buyer will be negotiating with. The three together are what the Readiness Call reads before the first conversation about targets.</p>
<div class="stream">
<span class="kicker">The value stream this feeds</span>
<ol class="stream-steps">
  <li><a href="diagnostic.html">01 · Diagnostic<em>Free · the business, and now the founder</em></a></li>
  <li><a href="roadmap.html">02 · Personalised Roadmap<em>From your goals, backwards</em></a></li>
  <li><a href="finance-advisory.html">03 · Insourcing<em>The business made separable</em></a></li>
  <li><a href="readiness-project.html">04 · Readiness Project<em>The number, and the life after it</em></a></li>
</ol>
</div>

<h2>Proof</h2>
<p class="body">"An exit is a life event" is the line this site leads with, and it is the reason ATM's exit advisory process begins with Founder Clarity before Gap Analysis, Business Readiness or Transaction Execution. The questions here are the ones David B Horne asks in the first hour of every exit engagement, drawn from <em>Add Then Multiply</em> and from the exits he has led as an officer of the client company.</p>
<p class="quote">"How small businesses can think like big businesses and achieve exponential growth." <em>Add Then Multiply</em>, David B Horne</p>

""",
 "cta_text": "The Readiness Call is where the personal plan gets built. There is no fee for the call, and nothing beyond it is scoped until you have decided what you want.",
 "note": NOTE + " Nothing on this page is financial planning advice; where a personal financial plan is needed we suggest an independent, regulated financial planner of your choosing.",
 "statements": [
  "I know my number: the amount I need from a sale, after tax, to live the life I want.",
  "I know what I will do on the first Monday after completion, and it is not \"come in as usual\".",
  "My co-owners and my family know my intentions and their timing, and they agree with them.",
  "I have a personal financial plan that does not depend on the business paying me every month.",
  "I could describe to a buyer what the business should look like in three years without me in it.",
  "I have decided what I will not accept in a deal: on price, on terms, and on how my people are treated.",
 ],
 "actions": [
  "Work out the number properly: what you need after tax, for how long, with an independent planner if the sums are not obvious. A guessed number is the most common reason a good offer gets refused, or a bad one accepted.",
  "Write one page on the year after completion: where you are, what you do on a Tuesday, what you have stopped doing. If the page is empty, that is the work.",
  "Have the conversation with co-owners and family before there is an offer on the table, with the timing and the number in it. Agreement found early is cheap.",
  "Separate your personal finances from the business: a plan that survives the salary stopping, the dividends stopping and the guarantees being released.",
  "Describe the business three years out without you, in writing. If you cannot, the buyer will write it for you, in the earn-out.",
  "Write down the deal you would walk away from: the price floor, the structure you will not accept, the protections for your people. Decide it now, calmly, not across a table.",
  "Write the business case down so a stranger could follow it. Founder clarity and business clarity are the same document read from two sides.",
  "Get a rolling twelve-month forecast in place that someone other than you owns; the number you need and the number the business can deliver have to meet.",
 ],
 "routes": {
  "programme": {"title": "Where this points: Founder Clarity, then the Roadmap",
   "text": "The business case and the revenue hold up; what is unsettled is you. The Readiness Call is the Founder Clarity conversation: the number, the life after, the people, the deal you would refuse. From there the Multiplier Diagnostic reads the business and the Personalised Roadmap works back from your goals.",
   "links": [["diagnostic.html", "Multiplier Diagnostic"], ["roadmap.html", "Personalised Roadmap"]]},
  "finance": {"title": "Where this points: Finance Advisory first",
   "text": "Your personal plan cannot be built on a business whose case or revenue is unclear, because the number you need and the number the business can deliver have to meet. We start with a Financial Deep Dive, then an insourced finance function, so the business side of the sum is real. Read about Finance Advisory, then book a Readiness Call.",
   "links": [["finance-advisory.html", "Finance Advisory"]]},
  "call": {"title": "Where this points: a Readiness Call, then the deep assessment",
   "text": "You are personally ready, and the business case and revenue hold. The next step is the Multiplier Diagnostic to read the whole business, and the Transaction Readiness Assessment to test it at a buyer's depth. Take the diagnostic first, or go straight to the Readiness Call.",
   "links": [["diagnostic.html", "Multiplier Diagnostic"], ["transaction-readiness.html", "Transaction Readiness Assessment"]]},
 },
 "plan": {
  "programme": [2, "Founder Clarity, then the Roadmap", "Founder Clarity is the first phase of ATM's exit advisory process: the number, the life after it, the people who need to agree, the deal you would refuse. It is settled on the Readiness Call and in the first weeks of the Personalised Roadmap, which starts from your personal and financial goals and works back to what the business must become. Your entry point is the Roadmap. Scope and fee are agreed on the Readiness Call."],
  "finance": [3, "Finance Advisory", "Finance Advisory starts with a Financial Deep Dive to establish the true position, then an insourced CFO or finance function on a 90-day sprint, so that the number the business can deliver is real before the personal plan is built on it. Your entry point is Insourcing. Scope and fee are agreed on the Readiness Call."],
  "call": [1, "The Multiplier Diagnostic, then Transaction Readiness", "Your next step is the Multiplier Diagnostic, free, to read the whole business, and then the Transaction Readiness Assessment at a buyer's depth. Book the Readiness Call and we will read all three together. Scope and fee for anything beyond the diagnostics are agreed on the call."],
 },
}

if __name__ == "__main__":
    page(FOUNDER_DEPENDENCE)
    page(PERSONAL_EXIT)
