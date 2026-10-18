#!/usr/bin/env python3
"""Emit 04_eval.sql (schema + metrics + curated gold set) and hr_eval_gold.csv.
Gold questions are drawn from Appendix A (practitioner-language bank) and mapped
to challenge codes with expected intent / escalation / source labels."""
import csv, os

OUT = "."
os.makedirs(OUT, exist_ok=True)

def s(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

# ext_id, question, expected_code, intent, escalate, requires_source, jurisdiction, difficulty, theme
GOLD = [
 ("G001","How do I even know if I'm on the right award? There's like 5 that could apply.","PF8","check",False,True,"federal",3,"pay"),
 ("G002","Do I have to backpay someone if I've had them on the wrong classification for two years?","PF27","escalate",True,True,"federal",5,"pay"),
 ("G003","Is cash in hand actually illegal or is it just not recommended?","PF22","explain",False,True,"federal",2,"pay"),
 ("G004","When does the junior rate stop and the adult rate kick in?","PF10","check",False,True,"federal",2,"pay"),
 ("G005","Do casuals get leave loading too or is that only for permanents?","PF14","check",False,True,"federal",2,"pay"),
 ("G006","Someone told me I'm underpaying my staff by $4/hr and I had no idea, what do I do now?","PF27","escalate",True,True,"federal",5,"pay"),
 ("G007","Do I have to pay penalty rates if my casual works a public holiday?","PF11","check",False,True,"federal",3,"pay"),
 ("G008","How do I sack someone without getting hit with an unfair dismissal claim?","PM8","decision",False,True,"federal",4,"termination"),
 ("G009","Do I need to give three written warnings before I can let someone go?","PM6","explain",False,True,"federal",3,"termination"),
 ("G010","They're still in their probation period, can I just end it, no questions asked?","PM1","check",False,True,"federal",3,"termination"),
 ("G011","Is there a magic number of employees where the dismissal rules change?","PM8","explain",False,True,"federal",2,"termination"),
 ("G012","I've never done a warning letter in my life, is there a template?","PM6","draft",False,False,"federal",2,"termination"),
 ("G013","What actually counts as serious misconduct that lets me sack someone on the spot?","PM7","explain",False,True,"federal",4,"termination"),
 ("G014","If I make the role redundant can I hire someone else to do the same job three months later?","PM10","decision",True,True,"federal",4,"redundancy"),
 ("G015","Do I have to pay redundancy if I've only got 8 staff?","PM10","check",False,True,"federal",3,"redundancy"),
 ("G016","If I'm under 15 employees am I completely off the hook for redundancy pay?","PM10","check",False,True,"federal",3,"redundancy"),
 ("G017","Is it still a genuine redundancy if I just don't like the person?","PM10","escalate",True,True,"federal",5,"redundancy"),
 ("G018","Do I have to let them work from home if they ask?","PM12","explain",False,True,"federal",3,"flexible"),
 ("G019","What counts as a reasonable business ground to say no to working from home?","PM12","explain",False,True,"federal",3,"flexible"),
 ("G020","Do I need to put a flexible-work refusal in writing or can I just tell them?","PM12","check",False,True,"federal",3,"flexible"),
 ("G021","Can you actually get taken to the Commission just for saying no to a WFH request?","PM12","explain",False,True,"federal",3,"flexible"),
 ("G022","Is yelling actually workplace bullying or is my manager just intense?","PM16","explain",False,True,"federal",3,"conflict"),
 ("G023","One of my staff says another is bullying her but there are no witnesses, what do I do?","PM16","escalate",True,True,"federal",5,"conflict"),
 ("G024","Do I have to formally investigate every complaint or can I just have a chat with both of them?","PM16","decision",False,True,"federal",4,"conflict"),
 ("G025","Can I call the doctor's clinic to check if a medical certificate is real?","PF15","explain",False,True,"federal",3,"leave"),
 ("G026","Every Monday, every second week, is that a pattern I can act on or am I overreacting?","PM18","decision",False,False,"federal",3,"leave"),
 ("G027","Do I have to accept a medical certificate from an online telehealth service?","PF15","check",False,True,"federal",2,"leave"),
 ("G028","Can I withhold their final pay if they didn't work their notice period?","PM11","check",False,True,"federal",4,"notice"),
 ("G029","She didn't turn up today and isn't answering, do I treat that as abandonment or resignation?","PM11","decision",False,True,"federal",4,"notice"),
 ("G030","How much notice do I legally have to give if I'm the one letting them go?","PM11","calc",False,True,"federal",3,"notice"),
 ("G031","I've had the same casual for three years, do I have to make her permanent now?","PF7","check",False,True,"federal",3,"casual"),
 ("G032","What's actually the difference between a casual and a full timer, is it just hours?","PF6","explain",False,True,"federal",2,"casual"),
 ("G033","Are casuals entitled to long service leave?","PF17","check",False,True,"federal",3,"lsl"),
 ("G034","Can I cash out long service leave while they're still working or only when they leave?","PF17","check",False,True,"nsw",3,"lsl"),
 ("G035","Every state seems to have different long service leave rules, which one applies to me?","PF17","explain",False,True,"federal",3,"lsl"),
 ("G036","I wear all the hats here including HR, is there a plain-English checklist for this stuff?","X7","explain",False,False,"federal",1,"overwhelm"),
 ("G037","I found out I've been doing this wrong for two years, how do I fix it retroactively?","PF27","escalate",True,True,"federal",5,"overwhelm"),
 ("G038","Had three interview rounds, they said a week, it's been a month and silence.","RS20","explain",False,False,"federal",1,"ghosting"),
 ("G039","Candidate accepted the offer verbally, didn't show up on day one, phone's off.","RS19","explain",False,False,"federal",2,"ghosting"),
 ("G040","We sent the contract, they signed it, then never turned up.","RS19","explain",False,False,"federal",2,"ghosting"),
 ("G041","I signed, they signed, now they say there's a hiring freeze, can they pull the offer?","RS16","explain",False,True,"federal",4,"offer"),
 ("G042","Do I owe notice pay if I pull a job offer before their start date?","RS16","check",False,True,"federal",4,"offer"),
 ("G043","They accepted our offer then their boss offered more money, do we just let them go?","RS18","decision",False,False,"federal",2,"counteroffer"),
 ("G044","What do I advertise as the salary if I'm not sure which award the role sits under?","RA11","check",False,True,"federal",3,"pay-hiring"),
 ("G045","Do I have to publish a salary range now or is that just for bigger companies?","RA12","explain",False,True,"federal",2,"pay-hiring"),
 ("G046","Posted the job three weeks ago, 40 applications, maybe 2 are relevant, what am I doing wrong?","RS1","decision",False,False,"federal",2,"volume"),
 ("G047","I just copied an ad from Seek and changed the title, is that fine?","RA6","draft",False,False,"federal",2,"volume"),
 ("G048","Do I actually need a police check for this role or am I overcomplicating it?","RS13","check",False,True,"federal",3,"checks"),
 ("G049","Great candidate but needs visa sponsorship, is that even worth it for a small business?","RA17","escalate",True,True,"federal",4,"visa"),
 ("G050","This is my first ever employee, what do I legally need before day one?","RS26","explain",False,True,"federal",3,"onboarding"),
 ("G051","Do I need an employment contract or is a verbal agreement and a handshake enough?","PF1","check",False,True,"federal",2,"onboarding"),
 ("G052","I've never done payroll, what happens if I get the first pay run wrong?","PF24","explain",False,True,"federal",3,"onboarding"),
]

# --- Expansion to ~200: coverage across all 102 challenges. Sources: Appendix A forum
# language + authored SME-voice paraphrases. Leakage-checked against enriched_docs.tsv. ---
GOLD_EXTRA = [
 ("G053","Do I need to give him something in writing or is a handshake enough?","PF1","check",False,True,"federal",2,"contract"),
 ("G054","Can I keep a staff member on rolling one-year contracts indefinitely?","PF2","check",False,True,"federal",3,"fixed-term"),
 ("G055","Is there a form I have to hand out whenever I put someone on a fixed-term contract?","PF2","explain",False,True,"federal",2,"fixed-term"),
 ("G056","My contractor only works for me and I tell him when to show up - is he really an employee?","PF3","check",False,True,"federal",4,"classification"),
 ("G057","Someone said my contractor should really be on the books - how do I tell?","PF3","explain",False,True,"federal",4,"classification"),
 ("G058","Is it illegal to put someone on an ABN just to dodge super and leave?","PF4","explain",False,True,"federal",4,"sham"),
 ("G059","What's this opt-out notice for high-earning contractors about?","PF5","explain",False,True,"federal",3,"classification"),
 ("G060","What actually makes someone a casual now - is it just no guaranteed hours?","PF6","explain",False,True,"federal",3,"casual"),
 ("G061","My casual's been regular for over a year - do I have to offer to make her permanent?","PF7","check",False,True,"federal",3,"casual"),
 ("G062","How do I figure out which award covers my cafe staff?","PF8","check",False,True,"federal",3,"award"),
 ("G063","Is there even an award for an admin person in a construction business?","PF8","check",False,True,"federal",3,"award"),
 ("G064","How do I know what level to put my new hire on within the award?","PF9","check",False,True,"federal",3,"award"),
 ("G065","My employee's picked up extra duties - do I need to bump their classification?","PF9","check",False,True,"federal",3,"award"),
 ("G066","Where do I find the current minimum pay rate for this role?","PF10","check",False,True,"federal",2,"pay"),
 ("G067","The award rates went up in July - do I have to change everyone's pay?","PF10","check",False,True,"federal",3,"pay"),
 ("G068","Do I pay time and a half or double time on a Sunday?","PF11","calc",False,True,"federal",3,"pay"),
 ("G069","Does my casual get penalty rates on top of the casual loading?","PF11","check",False,True,"federal",3,"pay"),
 ("G070","If I pay a flat salary do I still have to worry about the award?","PF12","check",False,True,"federal",3,"pay"),
 ("G071","Do I have to reconcile annualised salaries against the award each year?","PF12","check",False,True,"federal",4,"pay"),
 ("G072","What are the minimum things I legally have to give every employee?","PF13","explain",False,True,"federal",2,"nes"),
 ("G073","Can I make staff take annual leave during our Christmas shutdown?","PF14","check",False,True,"federal",3,"leave"),
 ("G074","An employee has heaps of leave banked - can I force them to take some?","PF14","check",False,True,"federal",3,"leave"),
 ("G075","How much sick leave does a part-timer actually get?","PF15","calc",False,True,"federal",2,"leave"),
 ("G076","Can I ask for a medical certificate for a single day off?","PF15","check",False,True,"federal",2,"leave"),
 ("G077","How does the government paid parental leave fit with what I have to pay?","PF16","explain",False,True,"federal",3,"leave"),
 ("G078","When does long service leave kick in in Victoria?","PF17","check",False,True,"vic",3,"lsl"),
 ("G079","We're in Queensland - how many years until someone gets long service leave?","PF17","check",False,True,"qld",3,"lsl"),
 ("G080","How many days compassionate leave do I have to give if someone's parent dies?","PF18","check",False,True,"federal",2,"leave"),
 ("G081","Do I have to pay family and domestic violence leave, and is it kept confidential?","PF19","check",False,True,"federal",3,"leave"),
 ("G082","One of my staff got called for jury duty - do I have to pay them?","PF20","check",False,True,"federal",2,"leave"),
 ("G083","What employee records am I legally required to keep, and for how long?","PF21","explain",False,True,"federal",2,"records"),
 ("G084","Do I have to give a payslip if I'm paying someone in cash?","PF22","check",False,True,"federal",2,"payroll"),
 ("G085","Do I really need timesheets if everyone works set hours?","PF23","check",False,True,"federal",2,"payroll"),
 ("G086","What's the super rate I have to pay now?","PF24","check",False,True,"federal",2,"super"),
 ("G087","Do I have to pay super on overtime?","PF24","check",False,True,"federal",3,"super"),
 ("G088","I heard super has to be paid every payday now - when did that start?","PF25","explain",False,True,"federal",3,"super"),
 ("G089","Do I have to change my payroll to pay super at the same time as wages?","PF25","explain",False,True,"federal",3,"super"),
 ("G090","Is underpaying staff actually a crime now?","PF26","explain",False,True,"federal",3,"underpayment"),
 ("G091","I just realised I've underpaid three staff for over a year - what do I do?","PF27","escalate",True,True,"federal",5,"underpayment"),
 ("G092","Do I have to report every pay run to the ATO through Single Touch Payroll?","PF28","check",False,True,"federal",2,"payroll"),
 ("G093","Can I extend someone's probation if I'm still not sure about them?","PM1","check",False,True,"federal",3,"probation"),
 ("G094","What should I actually cover on someone's first day?","PM2","explain",False,False,"federal",1,"onboarding"),
 ("G095","What workplace policies am I legally required to have?","PM3","explain",False,True,"federal",2,"policies"),
 ("G096","Do I need a written code of conduct for a team of five?","PM3","check",False,False,"federal",2,"policies"),
 ("G097","Should I be writing down every performance conversation I have?","PM4","check",False,False,"federal",2,"performance"),
 ("G098","How do I put someone on a performance improvement plan properly?","PM5","decision",False,True,"federal",4,"performance"),
 ("G099","Do I have to give a written warning before a final warning?","PM6","explain",False,True,"federal",3,"discipline"),
 ("G100","He turned up drunk and abused a customer - can I sack him on the spot?","PM7","decision",True,True,"federal",5,"misconduct"),
 ("G101","How many warnings before I can legally let someone go?","PM8","explain",False,True,"federal",3,"termination"),
 ("G102","We've got 12 staff - do the unfair dismissal rules still apply to me?","PM8","explain",False,True,"federal",3,"termination"),
 ("G103","Can I sack someone who just put in a complaint about their manager?","PM9","escalate",True,True,"federal",5,"adverse-action"),
 ("G104","She just told me she's pregnant and now I want to restructure her out - is that ok?","PM9","escalate",True,True,"federal",5,"adverse-action"),
 ("G105","Can I make the position redundant and hand the duties to someone else?","PM10","decision",True,True,"federal",4,"redundancy"),
 ("G106","Is notice still required even if I don't owe redundancy pay?","PM10","check",False,True,"federal",3,"redundancy"),
 ("G107","How much notice do I owe based on how long they've worked here?","PM11","calc",False,True,"federal",3,"notice"),
 ("G108","Can I pay them out instead of making them work their notice?","PM11","check",False,True,"federal",3,"notice"),
 ("G109","Do I have to say yes if a parent asks to drop to part-time?","PM12","explain",False,True,"federal",3,"flexible"),
 ("G110","Can I say no to working from home just because I want everyone in the office?","PM12","decision",False,True,"federal",3,"flexible"),
 ("G111","Can I still text my staff after hours or is that not allowed now?","PM13","explain",False,True,"federal",3,"flexible"),
 ("G112","The right to disconnect - does it apply to my small business yet?","PM13","explain",False,True,"federal",2,"flexible"),
 ("G113","What do I actually have to do about psychosocial hazards?","PM14","explain",False,True,"federal",3,"whs"),
 ("G114","Is workload stress something I'm legally on the hook for now?","PM14","explain",False,True,"federal",3,"whs"),
 ("G115","What are my WHS duties as the owner of a small business?","PM15","explain",False,True,"federal",3,"whs"),
 ("G116","Two staff had a screaming match - do I have to formally investigate?","PM16","decision",False,True,"federal",3,"investigation"),
 ("G117","There's a serious bullying complaint against my supervisor with no witnesses - what now?","PM16","escalate",True,True,"federal",5,"investigation"),
 ("G118","Half my team left this year - how do I work out why?","PM17","decision",False,False,"federal",2,"retention"),
 ("G119","Someone's always off sick on a Monday - can I do anything about it?","PM18","decision",False,False,"federal",3,"absence"),
 ("G120","If my one bookkeeper leaves I'm stuffed - how do I lower that risk?","PM19","decision",False,False,"federal",2,"succession"),
 ("G121","What's this positive duty on sexual harassment I'm supposed to comply with?","PM20","explain",False,True,"federal",3,"positive-duty"),
 ("G122","My best employee looks completely burnt out - what am I meant to do?","PM21","decision",False,False,"federal",3,"wellbeing"),
 ("G123","Do I even need to fill this role or can the team absorb it?","RA1","decision",False,False,"federal",2,"workforce-need"),
 ("G124","Should I make this new person casual or permanent?","RA2","decision",False,True,"federal",3,"engagement-type"),
 ("G125","How do I write a job description when I'm not even sure what I need?","RA3","draft",False,False,"federal",2,"jd"),
 ("G126","Am I asking for too much in one role?","RA4","check",False,False,"federal",2,"jd"),
 ("G127","This role's turning into three jobs in one - is that a problem?","RA5","decision",False,False,"federal",2,"jd"),
 ("G128","Can you help me write a job ad for a receptionist?","RA6","draft",False,False,"federal",2,"job-ad"),
 ("G129","Can I say I want a young, energetic person in my ad?","RA7","check",False,True,"federal",3,"job-ad"),
 ("G130","Is it legal to ask for a native English speaker in a job ad?","RA7","check",False,True,"federal",3,"job-ad"),
 ("G131","Where's the cheapest place to advertise a job that actually works?","RA8","decision",False,False,"federal",2,"channels"),
 ("G132","Why would anyone pick my small business over a big employer?","RA9","decision",False,False,"federal",2,"evp"),
 ("G133","Is it bad to leave a job ad up when I'm not really hiring right now?","RA10","check",False,False,"federal",2,"ghost-job"),
 ("G134","How do I set a salary range when I don't have benchmarking data?","RA11","decision",False,True,"federal",3,"pay-band"),
 ("G135","Will I actually get more applicants if I show the pay?","RA12","explain",False,False,"federal",2,"transparency"),
 ("G136","Can I advertise a rate below the award if it's plus super?","RA13","check",False,True,"federal",4,"pay-band"),
 ("G137","Could I get in trouble for paying two people in the same role differently?","RA14","explain",False,True,"federal",3,"pay-equity"),
 ("G138","The candidate wants $10k more than I budgeted - how do I handle it?","RA15","decision",False,False,"federal",3,"negotiation"),
 ("G139","Is it a good time to be hiring or is everyone struggling to find people?","RA16","explain",False,False,"federal",2,"market"),
 ("G140","How long does employer visa sponsorship actually take?","RA17","explain",True,True,"federal",4,"visa"),
 ("G141","It's taking forever to fill this role - what am I doing wrong?","RA18","decision",False,False,"federal",2,"time-to-fill"),
 ("G142","There are way too many applicants and I can't get through them all.","RS1","decision",False,False,"federal",2,"screening"),
 ("G143","Is it risky to let the software auto-reject candidates for me?","RS2","explain",False,True,"federal",4,"ai-hiring"),
 ("G144","How do I score CVs consistently instead of going on gut feel?","RS3","decision",False,False,"federal",3,"screening"),
 ("G145","Do I need to keep notes on why I rejected people?","RS4","check",False,True,"federal",3,"shortlisting"),
 ("G146","What should I ask in a quick phone screen?","RS5","draft",False,False,"federal",2,"phone-screen"),
 ("G147","Is it ok to make candidates do a recorded video interview with no human?","RS6","check",False,True,"federal",3,"video"),
 ("G148","Can I ask a candidate if they're planning to have kids?","RS7","check",False,True,"federal",3,"interview"),
 ("G149","Is it illegal to ask how old someone is in an interview?","RS7","check",False,True,"federal",3,"interview"),
 ("G150","How do I run a proper structured interview?","RS8","draft",False,False,"federal",3,"interview"),
 ("G151","How do I score candidates across a panel fairly?","RS9","draft",False,False,"federal",3,"interview"),
 ("G152","Do I really need personality tests to hire a warehouse worker?","RS10","check",False,False,"federal",2,"assessment"),
 ("G153","A candidate asked for adjustments for their disability in the test - what do I have to do?","RS11","explain",False,True,"federal",3,"assessment"),
 ("G154","What can I legally ask a referee?","RS12","check",False,True,"federal",3,"checks"),
 ("G155","Can I refuse to hire someone because of an old criminal record?","RS13","decision",False,True,"federal",4,"checks"),
 ("G156","How do I check someone's visa lets them work full-time?","RS14","explain",False,True,"federal",3,"right-to-work"),
 ("G157","How do I verify someone actually has the qualification they claim?","RS15","explain",False,False,"federal",2,"checks"),
 ("G158","What has to be in a written offer of employment?","RS16","check",False,True,"federal",3,"offer"),
 ("G159","How long can a probation period actually be?","RS17","check",False,True,"federal",2,"offer"),
 ("G160","My best candidate got counter-offered by their current employer - now what?","RS18","decision",False,False,"federal",3,"counteroffer"),
 ("G161","A candidate accepted then went silent - do I chase or move on?","RS19","decision",False,False,"federal",2,"ghosting"),
 ("G162","How long is too long to leave a candidate waiting after an interview?","RS20","explain",False,False,"federal",2,"time-to-hire"),
 ("G163","Recruitment agencies want 15% - is there a cheaper way?","RS21","decision",False,False,"federal",2,"cost"),
 ("G164","If my hiring software turns out to be biased, am I the one who gets in trouble?","RS22","explain",False,True,"federal",4,"ai-hiring"),
 ("G165","Do I have to tell candidates I'm using AI to screen them?","RS23","check",False,True,"federal",3,"ai-hiring"),
 ("G166","Does privacy law even apply to the employee data I hold?","RS24","explain",False,True,"federal",3,"privacy"),
 ("G167","How do I vet an AI hiring tool before I buy it?","RS25","decision",False,True,"federal",3,"ai-hiring"),
 ("G168","What do I need sorted before a new hire's first day?","RS26","explain",False,True,"federal",2,"onboarding"),
 ("G169","I'm running all my HR on spreadsheets - what am I most at risk of missing?","X1","decision",False,False,"federal",2,"tooling"),
 ("G170","If I ever got audited, what records would I be missing?","X2","check",False,True,"federal",3,"records"),
 ("G171","This termination is getting messy - should I get a lawyer involved?","X3","escalate",True,False,"federal",4,"escalation"),
 ("G172","This visa sponsorship stuff is over my head - who do I even call?","X4","escalate",True,False,"federal",3,"escalation"),
 ("G173","How much does it actually cost to get HR advice when I need it?","X5","explain",False,False,"federal",2,"cost"),
 ("G174","I've got no time for HR admin - what actually matters most?","X6","decision",False,False,"federal",2,"time"),
 ("G175","There's no HR here, it's just me - where do I even start?","X7","explain",False,False,"federal",1,"overwhelm"),
 ("G176","Who's the right person to ask about this - my accountant or a lawyer?","X8","explain",False,False,"federal",2,"where-to-go"),
 ("G177","Is it cheaper to pay a consultant or just risk doing it myself?","X9","decision",False,False,"federal",2,"economics"),
 ("G178","My staff worked a public holiday - what am I supposed to pay them?","PF11","calc",False,True,"nsw",3,"pay"),
 ("G179","Do apprentices have their own separate pay rates?","PF10","check",False,True,"federal",3,"pay"),
 ("G180","The award calls it a level 3 - how do I know if that's my employee?","PF9","check",False,True,"federal",3,"award"),
 ("G181","He's only been here 6 months - can I still let him go easily?","PM8","check",False,True,"federal",3,"termination"),
 ("G182","What's the actual process to fairly dismiss someone for poor performance?","PM8","decision",False,True,"federal",4,"termination"),
 ("G183","Can I performance-manage someone right after they made a bullying complaint?","PM9","escalate",True,True,"federal",5,"adverse-action"),
 ("G184","Everyone says advertise the salary - is that actually required by law?","RA12","explain",False,True,"federal",2,"transparency"),
 ("G185","What questions am I actually not allowed to ask in an interview?","RS7","explain",False,True,"federal",3,"interview"),
 ("G186","Should everyone on the interview panel ask the same questions?","RS9","check",False,False,"federal",2,"interview"),
 ("G187","Do casuals get any paid sick leave at all?","PF15","check",False,True,"federal",2,"leave"),
 ("G188","Do I have to pay out unused annual leave when someone quits?","PF14","check",False,True,"federal",3,"leave"),
 ("G189","Can I sack someone for one serious stuff-up or do I need warnings first?","PM6","decision",False,True,"federal",4,"discipline"),
 ("G190","Can I withdraw an offer after the person's already signed it?","RS16","check",False,True,"federal",4,"offer"),
 ("G191","If I just make everyone a contractor, is that going to be a problem?","PF4","check",False,True,"federal",4,"sham"),
 ("G192","My casual wants to stay casual - can they refuse to convert?","PF7","check",False,True,"federal",3,"casual"),
 ("G193","Do I have to consult my staff before making anyone redundant?","PM10","check",False,True,"federal",3,"redundancy"),
 ("G194","I forgot to pay super last quarter - what happens now?","PF24","explain",False,True,"federal",4,"super"),
 ("G195","Do I have to let the accused person respond before I decide anything?","PM16","check",False,True,"federal",3,"investigation"),
 ("G196","What happens to me if I accidentally hire someone without work rights?","RS14","explain",False,True,"federal",4,"right-to-work"),
 ("G197","Can I make my new hire sign a non-compete?","PF1","check",False,True,"federal",3,"contract"),
 ("G198","How do I handle a resignation - do I need it in writing?","PM11","check",False,False,"federal",2,"notice"),
 ("G199","Do I have to advertise a role internally before going external?","RA6","check",False,False,"federal",2,"job-ad"),
 ("G200","A candidate's references were glowing but something feels off - what should I dig into?","RS12","decision",False,False,"federal",2,"checks"),
]
GOLD = GOLD + GOLD_EXTRA

DDL = r"""-- HQ.ai | Evaluation harness for the HR chatbots.
-- Gold set + run tracking + metrics (routing accuracy, retrieval recall@k,
-- escalation precision/recall/F1, groundedness). Run AFTER 03_question_items.sql.

-- ------------------------------------------------------------
-- Gold set: curated, labelled evaluation questions
-- ------------------------------------------------------------
create table if not exists public.hr_eval_gold (
    id                   uuid primary key default gen_random_uuid(),
    ext_id               text unique,                    -- stable label, e.g. 'G001'
    question_text        text not null,
    expected_challenge_code text not null
                           references public.hr_challenges(code) on update cascade,
    expected_intent      text check (expected_intent in
                           ('draft','check','explain','decision','calc','escalate')),
    expected_escalation  boolean not null default false, -- must the bot route to advice?
    requires_source      boolean not null default false, -- answer must cite a T1 source
    jurisdiction         text not null default 'federal',
    difficulty           smallint check (difficulty between 1 and 5),
    theme                text,
    created_at           timestamptz not null default now()
);
comment on table public.hr_eval_gold is
    'Curated gold questions (practitioner-voice) with expected challenge / intent / escalation / source labels. Grow toward 200-500 for stable metrics.';

-- ------------------------------------------------------------
-- Eval runs: one row per model/config evaluated
-- ------------------------------------------------------------
create table if not exists public.hr_eval_runs (
    id           uuid primary key default gen_random_uuid(),
    label        text,                                   -- 'baseline-minilm-384', 'rerank-v2', ...
    model_name   text,
    config       jsonb default '{}',
    notes        text,
    created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Eval results: one row per (run x gold item) with predictions
-- ------------------------------------------------------------
create table if not exists public.hr_eval_results (
    id                    bigint generated always as identity primary key,
    run_id                uuid not null references public.hr_eval_runs(id) on delete cascade,
    gold_id               uuid not null references public.hr_eval_gold(id) on delete cascade,
    predicted_challenge_code text,
    retrieved_codes       text[] default '{}',           -- top-k retrieved challenge codes
    predicted_intent      text,
    predicted_escalation  boolean,
    answer_grounded       boolean,                       -- did the answer cite required source when needed
    answer_correct        boolean,                       -- optional human/judge label
    latency_ms            integer,
    raw                   jsonb default '{}',
    created_at            timestamptz not null default now(),
    unique (run_id, gold_id)
);
create index if not exists hr_eval_results_run_idx on public.hr_eval_results (run_id);

-- ------------------------------------------------------------
-- Metrics: everything a run needs, in one call
--   select * from hr_eval_metrics('<run_id>');
-- ------------------------------------------------------------
create or replace function public.hr_eval_metrics(p_run uuid)
returns table (metric text, value numeric, n integer)
language sql stable as $$
with r as (
  select res.*, g.expected_challenge_code, g.expected_intent,
         g.expected_escalation, g.requires_source
  from public.hr_eval_results res
  join public.hr_eval_gold g on g.id = res.gold_id
  where res.run_id = p_run
)
select 'n_evaluated', count(*)::numeric, count(*)::int from r
union all
select 'challenge_routing_accuracy',
       round(avg((predicted_challenge_code = expected_challenge_code)::int)::numeric, 4),
       count(*)::int from r
union all
select 'retrieval_recall_at_k',
       round(avg((expected_challenge_code = any(retrieved_codes))::int)::numeric, 4),
       count(*)::int from r
union all
select 'intent_accuracy',
       round(avg((predicted_intent = expected_intent)::int)::numeric, 4),
       count(*) filter (where predicted_intent is not null)::int from r
union all
select 'escalation_precision',
       round( (count(*) filter (where predicted_escalation and expected_escalation))::numeric
              / nullif(count(*) filter (where predicted_escalation),0), 4),
       count(*) filter (where predicted_escalation)::int from r
union all
select 'escalation_recall',
       round( (count(*) filter (where predicted_escalation and expected_escalation))::numeric
              / nullif(count(*) filter (where expected_escalation),0), 4),
       count(*) filter (where expected_escalation)::int from r
union all
select 'escalation_f1',
       round( 2.0 * (count(*) filter (where predicted_escalation and expected_escalation))::numeric
              / nullif( 2.0*(count(*) filter (where predicted_escalation and expected_escalation))
                        + (count(*) filter (where predicted_escalation and not expected_escalation))
                        + (count(*) filter (where not coalesce(predicted_escalation,false) and expected_escalation)), 0), 4),
       count(*) filter (where expected_escalation)::int from r
union all
select 'groundedness_rate',
       round(avg((answer_grounded)::int) filter (where requires_source)::numeric, 4),
       count(*) filter (where requires_source)::int from r;
$$;
"""

with open(os.path.join(OUT, "04_eval.sql"), "w", encoding="utf-8") as f:
    f.write(DDL)
    f.write("\n-- ------------------------------------------------------------\n")
    f.write("-- Gold seed (curated from Appendix A). Idempotent on ext_id.\n")
    f.write("-- ------------------------------------------------------------\n")
    f.write("insert into public.hr_eval_gold\n"
            "  (ext_id,question_text,expected_challenge_code,expected_intent,"
            "expected_escalation,requires_source,jurisdiction,difficulty,theme) values\n")
    rows = []
    for g in GOLD:
        rows.append("  ({},{},{},{},{},{},{},{},{})".format(
            s(g[0]), s(g[1]), s(g[2]), s(g[3]), s(g[4]), s(g[5]), s(g[6]), s(g[7]), s(g[8])))
    f.write(",\n".join(rows))
    f.write("\non conflict (ext_id) do update set\n"
            "  question_text=excluded.question_text,"
            "  expected_challenge_code=excluded.expected_challenge_code,\n"
            "  expected_intent=excluded.expected_intent,"
            "  expected_escalation=excluded.expected_escalation,\n"
            "  requires_source=excluded.requires_source,"
            "  jurisdiction=excluded.jurisdiction,"
            "  difficulty=excluded.difficulty, theme=excluded.theme;\n")

with open(os.path.join(OUT, "hr_eval_gold.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["ext_id","question_text","expected_challenge_code","expected_intent",
                "expected_escalation","requires_source","jurisdiction","difficulty","theme"])
    for g in GOLD:
        w.writerow(list(g))

esc = sum(1 for g in GOLD if g[4])
src = sum(1 for g in GOLD if g[5])
print(f"gold rows: {len(GOLD)} | escalation=true: {esc} | requires_source=true: {src}")
codes = sorted({g[2] for g in GOLD})
print(f"distinct challenge codes covered: {len(codes)}")
