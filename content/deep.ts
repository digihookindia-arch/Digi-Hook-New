// Generated from the design prototype — copy is final and approved, carried
// across verbatim. Deeper "deep page" layout: medical and real estate.

import type { DeepContent } from './types';

export const deeps: Record<'medical' | 'realestate', DeepContent> = {
  "realestate": {
    "kicker": "Real Estate Technology Solutions",
    "title": "Real estate websites, landing pages and lead CRM — in one system.",
    "lead": "Getting property enquiries is the easy part. Keeping track of them is where most real estate marketing budgets are quietly lost.",
    "lead2": "Your enquiries arrive from Meta ads, Google, your website, landing pages, WhatsApp, portals and referrals. If they live in personal phones and spreadsheets, follow-ups get missed and no one can prove which campaign actually produced a booking. We connect the whole path instead — advertisement, enquiry, follow-up, site visit, booking — for developers, brokers, channel partners and project sales teams.",
    "chips": [
      "Project websites",
      "Campaign landing pages",
      "Lead CRM",
      "Meta CAPI",
      "Site visit tracking"
    ],
    "hasSplit": false,
    "noSplit": true,
    "leakKicker": "The problem",
    "leakTitle": "Why do more leads not produce more sales?",
    "leakIntro": "Because leads are lost between the advertisement and the site visit, not at either end. Three gaps cause nearly all of it.",
    "problems": [
      {
        "num": "01",
        "title": "Leads live in personal phones",
        "body": "WhatsApp threads and individual spreadsheets mean no one can answer a simple question: how many enquiries came in this week, and what happened to each of them?"
      },
      {
        "num": "02",
        "title": "Follow-up depends on memory",
        "body": "Most buyers do not decide on the first call. Without stored dates and reminders, the lead who asked to be called after the weekend is simply never called."
      },
      {
        "num": "03",
        "title": "Campaigns judged on cost per lead",
        "body": "A campaign with 100 leads can produce fewer site visits than one with 30. Without source tracking tied to outcomes, budget follows volume instead of bookings."
      }
    ],
    "moreKicker": "What you get",
    "moreTitle": "What does a real estate platform do that a website cannot?",
    "moreIntro": "A website shows floor plans, amenities and a contact form. A platform takes the enquiry that form produces and runs it through your sales process until it closes.",
    "moreIntro2": "Our objective is not to hand over a website or a CRM. It is a practical system in which your marketing, lead data, sales team and reporting work together.",
    "capabilities": [
      "Capture enquiries from every source into one system",
      "Assign and transfer leads to sales executives",
      "Track calls, notes, follow-ups and site visits",
      "See which campaigns produce better enquiries",
      "Send conversion data back to advertising platforms",
      "Measure team performance without chasing updates",
      "Reduce lead leakage and duplicate follow-ups",
      "Cut first-response time on new enquiries",
      "Give buyers a more professional experience",
      "Keep complete lead history in one place"
    ],
    "ecoKicker": "The three parts",
    "ecoTitle": "What is included?",
    "ecosystem": [
      {
        "num": "01",
        "title": "Project and developer websites",
        "body": "Professional sites for builders, developers, brokers and real estate brands — one project or a full portfolio.",
        "items": [
          "Project overview, pricing and payment plans",
          "Floor plans, amenities and construction status",
          "Location advantages, maps and connectivity",
          "Image and video galleries, downloadable brochures",
          "Site visit requests and enquiry forms",
          "WhatsApp and one-tap calling"
        ]
      },
      {
        "num": "02",
        "title": "High-converting landing pages",
        "body": "A paid advertisement should not send every visitor to a generic homepage. One offer, one conversion goal, per campaign.",
        "items": [
          "Premium apartment and plot investment pages",
          "Commercial and new-launch campaign pages",
          "Investor and end-user family variants",
          "Location-specific campaign pages",
          "Structured around a single primary action",
          "Engineered to load fast on mobile data"
        ]
      },
      {
        "num": "03",
        "title": "Real estate lead CRM",
        "body": "Manages enquiries from the moment they arrive — built around your sales process, not a generic template.",
        "items": [
          "Automatic and manual lead capture",
          "Assignment, transfer and status management",
          "Follow-up reminders, call notes and requirements",
          "Budget and location preference capture",
          "WhatsApp access and one-tap calling",
          "Source-wise, team-wise and stage-wise reports"
        ]
      }
    ],
    "stagesKicker": "Lead pipeline",
    "stagesTitle": "What are the stages a lead moves through?",
    "stagesIntro": "Eleven defined statuses. Every enquiry sits in exactly one of them, so management can see where the whole pipeline stands without asking anyone for an update.",
    "stages": [
      {
        "num": "01",
        "name": "New lead"
      },
      {
        "num": "02",
        "name": "Contacted"
      },
      {
        "num": "03",
        "name": "Not connected"
      },
      {
        "num": "04",
        "name": "Follow-up required"
      },
      {
        "num": "05",
        "name": "Interested"
      },
      {
        "num": "06",
        "name": "Site visit scheduled"
      },
      {
        "num": "07",
        "name": "Site visit completed"
      },
      {
        "num": "08",
        "name": "Negotiation"
      },
      {
        "num": "09",
        "name": "Booked"
      },
      {
        "num": "10",
        "name": "Not interested"
      },
      {
        "num": "11",
        "name": "Invalid / junk"
      }
    ],
    "panelKicker": "Meta Conversions API",
    "panelTitle": "What is Meta Conversions API, and why does it matter?",
    "panelBody1": "Advertising platforms learn from the data you send them. If Meta only sees form submissions, it knows someone filled a form — not whether that person was serious, visited the site, or booked a unit.",
    "panelBody2": "The Conversions API (CAPI) sends selected conversion events from your CRM or server back to Meta. Over time, better signals help campaigns optimise towards meaningful outcomes rather than the highest possible number of form fills.",
    "panelNote": "CAPI does not guarantee good leads. Campaign strategy, creative, targeting, the project offer, follow-up speed and sales execution still decide the result. What it does is connect advertising to what actually happened.",
    "panelTableTitle": "Events we can send back",
    "panelRows": [
      {
        "name": "Lead received",
        "stage": "Stage 01"
      },
      {
        "name": "Lead contacted",
        "stage": "Stage 02"
      },
      {
        "name": "Qualified lead",
        "stage": "Stage 05"
      },
      {
        "name": "Site visit scheduled",
        "stage": "Stage 06"
      },
      {
        "name": "Site visit completed",
        "stage": "Stage 07"
      },
      {
        "name": "Booking completed",
        "stage": "Stage 09"
      }
    ],
    "gapsTitle": "Why browser-only tracking is incomplete",
    "gaps": [
      "Cookie restrictions",
      "Browser privacy settings",
      "Ad blockers",
      "Page-loading failures",
      "Device switching",
      "Partial form tracking",
      "Delayed conversions"
    ],
    "gapsNote": "Server-side tracking shares approved conversion data more dependably. Combined with browser tracking and configured correctly, you get a measurement system you can set budgets on.",
    "opsKicker": "Daily operations",
    "opsTitle": "Which five things actually improve conversion?",
    "opsIntro": "Real estate conversion is decided by follow-up discipline far more than by ad spend. These five modules exist to make that discipline visible and measurable.",
    "ops": [
      {
        "num": "01",
        "title": "Lead source tracking",
        "body": "Meta, Google, website, landing page, portal, WhatsApp, direct call, referral, offline or organic — recorded on every lead, so campaigns are judged on site visits and bookings, not cost per lead."
      },
      {
        "num": "02",
        "title": "Sales team management",
        "body": "Leads assigned per executive, time to first contact, pending follow-ups, visits scheduled, qualified leads and bookings — accountability without manual reporting."
      },
      {
        "num": "03",
        "title": "Follow-up reminders",
        "body": "In the evening, after family discussion, after finance, after the next launch — the date is stored and the executive is reminded when action is due."
      },
      {
        "num": "04",
        "title": "Site visit management",
        "body": "Date, project, assigned executive, number of visitors, pickup requirement, confirmation, outcome, buyer feedback and the next follow-up — the most important stage, fully recorded."
      },
      {
        "num": "05",
        "title": "Marketing and sales aligned",
        "body": "Marketing learns which ads produced visits and bookings; sales learns which campaign and message the buyer arrived on. Both sides finally decide with the same data."
      }
    ],
    "audienceKicker": "Who it is built for",
    "audienceTitle": "Who is this built for?",
    "audience": [
      {
        "title": "Developers and builders",
        "body": "Multiple projects, centralised enquiries, team monitoring and project-versus-project performance."
      },
      {
        "title": "Real estate brokers",
        "body": "Enquiries organised by location, budget, property type and purchase intent."
      },
      {
        "title": "Channel partners",
        "body": "Leads tracked per developer, with accurate follow-up history for each."
      },
      {
        "title": "Project sales teams",
        "body": "Campaign leads, site visits, negotiations and booking status from one dashboard."
      },
      {
        "title": "Plotting and land projects",
        "body": "Plot sizes, availability, pricing, connectivity and investment potential presented clearly."
      },
      {
        "title": "Commercial real estate",
        "body": "Offices, shops, warehouses and investment assets, each with their own enquiry flow."
      }
    ],
    "startTitle": "What we ask before building anything.",
    "startIntro": "Every real estate company sells slightly differently. Before development we map what already exists:",
    "startItems": [
      "Your lead sources and monthly volume",
      "Number of projects and team structure",
      "How leads are assigned today",
      "Your follow-up and site visit stages",
      "Reporting management actually needs",
      "Advertising platforms in use"
    ],
    "startNote": "The platform is then structured around that workflow — phased, so you can start with lead capture and CRM and add modules as the team settles in.",
    "startCta": "Map my sales process",
    "faqs": [
      {
        "id": "re1",
        "q": "Is this only a real estate CRM?",
        "a": "No. It can combine your website, campaign landing pages, advertising lead flow, CRM, follow-up process, site visit management and conversion tracking into one connected system. You can also start with just the CRM and add the rest later."
      },
      {
        "id": "re2",
        "q": "Can leads from Meta Ads enter the CRM automatically?",
        "a": "Yes. Subject to the setup and available integrations, leads from Meta campaigns can flow directly into the CRM with their source, campaign and form details attached — no manual export."
      },
      {
        "id": "re3",
        "q": "Can leads be assigned to different employees?",
        "a": "Yes. An authorised administrator can assign or transfer leads to sales executives, and every reassignment stays in the lead history."
      },
      {
        "id": "re4",
        "q": "Does Meta CAPI guarantee better leads?",
        "a": "No technology can guarantee lead quality. CAPI improves the quality of conversion data Meta receives, which helps its optimisation — but results still depend on the project, offer, campaign strategy, creative, targeting, budget and how quickly your team follows up."
      },
      {
        "id": "re5",
        "q": "Can the CRM be used on mobile?",
        "a": "Yes. It is built as a responsive web application, so executives can update leads, log calls and record site visits from a phone between meetings."
      },
      {
        "id": "re6",
        "q": "Can we add more features later?",
        "a": "Yes. The system is developed in phases. Start with capture, assignment and follow-up; add site visit management, CAPI, attribution reporting or multi-project structure as the business grows."
      }
    ],
    "ctaTitle": "Let's find where your enquiries are being lost.",
    "ctaBody": "Tell us your current lead flow. We will show you where opportunities leak and recommend a practical system for your team — in writing, before any commitment."
  },
  "medical": {
    "kicker": "Medical Technology Solutions",
    "title": "Smarter systems for clinics and hospitals.",
    "lead": "Practical healthcare technology that simplifies daily operations, reduces paperwork, and helps medical teams manage patient information without fighting the software.",
    "lead2": "We build in two forms. An OPD Management System for individual doctors, clinics and diagnostic centres — website, appointments, records, prescriptions and payments in one connected system. And a Hospital Management System for hospitals and multi-department organisations, built in modules so you can start with essential operations and expand.",
    "chips": [
      "OPD system",
      "Hospital HMS",
      "Digital prescription",
      "Billing",
      "Role-based access"
    ],
    "hasSplit": true,
    "noSplit": false,
    "siteItems": [
      "Doctor profiles, qualifications and experience",
      "Services and treatments in plain language",
      "Timings, location, maps and directions",
      "Online appointment booking and enquiry",
      "Emergency contact and patient information",
      "Health education articles and FAQs"
    ],
    "splits": [
      {
        "num": "01",
        "kicker": "For clinics and outpatient centres",
        "title": "OPD Management System",
        "body": "A complete digital system for a clinic that sees patients and sends them home the same day. Website, appointments, records, prescriptions and payments, connected.",
        "forLabel": "Built for",
        "forWho": "Individual doctors · general and speciality clinics · dental, physiotherapy, paediatric, gynaecology, orthopaedic, dermatology and eye clinics · diagnostic centres",
        "items": [
          "Clinic website with online appointment booking",
          "Appointments, walk-ins, rescheduling and cancellations",
          "Patient records: history, allergies, diagnosis, visits",
          "Digital prescriptions with dosage, tests and instructions",
          "Follow-up scheduling and review reminders",
          "Payment tracking, discounts, pending and daily collections",
          "A clinic dashboard showing the whole day at a glance"
        ],
        "cta": "Scope an OPD system",
        "variant": "light"
      },
      {
        "num": "02",
        "kicker": "For hospitals and multi-department organisations",
        "title": "Hospital Management System",
        "body": "Everything in the OPD system, plus the admitted-patient side: wards, pharmacy, laboratory and hospital-wide billing on one shared patient record.",
        "forLabel": "Built for",
        "forWho": "Small and mid-size hospitals · multi-speciality centres · healthcare groups · day-care and surgical centres · multi-branch organisations",
        "items": [
          "Everything in the OPD Management System",
          "IPD from admission to discharge summary",
          "Bed, ward and room allocation with transfers",
          "Pharmacy inventory, issue, expiry and billing",
          "Laboratory booking, results and report delivery",
          "Structured billing across every hospital service",
          "Separate access for each staff role, plus a management dashboard"
        ],
        "cta": "Scope a hospital HMS",
        "variant": "accent"
      }
    ],
    "leakKicker": "Where the time goes",
    "leakTitle": "Disconnected tools create work instead of removing it.",
    "leakIntro": "Most clinics run a website, an appointment book, patient files and a payment register as four separate systems. Every gap between them becomes manual effort at the front desk.",
    "problems": [
      {
        "num": "01",
        "title": "The register is the system",
        "body": "Handwritten appointment books and paper files mean patient history takes minutes to find, and nothing can be reviewed once the file leaves the desk."
      },
      {
        "num": "02",
        "title": "Bookings arrive five different ways",
        "body": "Calls, WhatsApp, website forms, walk-ins and references, none of them in one list — so double bookings and forgotten confirmations become routine."
      },
      {
        "num": "03",
        "title": "Collections are invisible until month end",
        "body": "Consultation fees, procedure charges, discounts and pending amounts spread across registers make daily collection a reconstruction exercise."
      }
    ],
    "moreKicker": "One connected ecosystem",
    "moreTitle": "A patient journey that never leaves the system.",
    "moreIntro": "A patient finds the clinic, understands the services and requests an appointment. Your team then manages that appointment, maintains the record, prepares the prescription, records the payment and schedules the next visit — in one place.",
    "moreIntro2": "That single continuous flow is the point. It produces a smoother experience for the patient and materially less work for the clinic.",
    "capabilities": [
      "Appointments from website, phone and walk-in in one daily list",
      "Patient records retrievable in seconds during a consultation",
      "Clear digital prescriptions instead of illegible handwriting",
      "Consultation and procedure payments recorded as they happen",
      "Follow-up dates stored and surfaced to the right staff member",
      "Reports and lab documents organised per patient",
      "Role-based access, so staff see only what they should",
      "A daily dashboard of what needs attention right now",
      "Works on the reception desktop and on a phone",
      "Modules added in phases, not all at once"
    ],
    "ecoKicker": "Complimentary — included with both systems",
    "ecoTitle": "Whichever system you choose, the website comes with it.",
    "ecosystem": [
      {
        "num": "01",
        "title": "Clinic and hospital website",
        "body": "No separate quote, no separate project. The front end patients judge you by before they walk in — and the place every online appointment starts.",
        "items": [
          "Doctor profiles, qualifications and experience",
          "Services and treatments explained in plain language",
          "Consultation timings, location, maps and directions",
          "Online appointment booking and enquiry",
          "Emergency contact and patient information",
          "Health education articles and FAQs"
        ]
      }
    ],
    "stagesKicker": "A patient visit, end to end",
    "stagesTitle": "Nine steps, none of them on paper.",
    "stagesIntro": "This is the flow the system is built around. Each step hands the next one everything it needs, which is why the front desk stops re-entering the same information.",
    "stages": [
      {
        "num": "01",
        "name": "Enquiry or booking"
      },
      {
        "num": "02",
        "name": "Appointment confirmed"
      },
      {
        "num": "03",
        "name": "Registration"
      },
      {
        "num": "04",
        "name": "Waiting queue"
      },
      {
        "num": "05",
        "name": "Consultation"
      },
      {
        "num": "06",
        "name": "Digital prescription"
      },
      {
        "num": "07",
        "name": "Payment recorded"
      },
      {
        "num": "08",
        "name": "Follow-up scheduled"
      },
      {
        "num": "09",
        "name": "Records updated"
      }
    ],
    "panelKicker": "Security and controlled access",
    "panelTitle": "Healthcare data deserves engineering, not assurances.",
    "panelBody1": "Patient information is sensitive from the first form field onward. That means encrypted transmission, real authentication, role-based access, session controls, activity records and backups — configured deliberately, not switched on afterwards.",
    "panelBody2": "The exact technical and compliance controls depend on your organisation's size, workflow, the categories of data processed, the hosting arrangement and the requirements that apply to you. We agree them in writing before development begins.",
    "panelNote": "No digital system should claim guaranteed security or automatic regulatory compliance. Security is continuous: correct configuration, responsible staff usage, monitoring and regular updates. We tell you what is in place and what remains your decision.",
    "panelTableTitle": "Controls we implement",
    "panelRows": [
      {
        "name": "Data in transit",
        "stage": "TLS 1.3"
      },
      {
        "name": "Authentication",
        "stage": "Secure login"
      },
      {
        "name": "Access",
        "stage": "Role-based"
      },
      {
        "name": "Sessions",
        "stage": "Timed out"
      },
      {
        "name": "Audit",
        "stage": "Activity logged"
      },
      {
        "name": "Backups",
        "stage": "Scheduled"
      }
    ],
    "gapsTitle": "Access separated by staff role",
    "gaps": [
      "Doctors",
      "Nurses",
      "Receptionists",
      "Pharmacists",
      "Laboratory staff",
      "Accounts",
      "Administrators",
      "Management"
    ],
    "gapsNote": "Each user reaches only the modules and information relevant to their role. That reduces unnecessary exposure of sensitive data and makes accountability straightforward when something needs to be traced.",
    "opsKicker": "Hospital modules",
    "opsTitle": "Six departments, one patient record.",
    "opsIntro": "Hospitals fail on the joins between departments, not within them. These modules are built to share one record rather than keep six.",
    "ops": [
      {
        "num": "01",
        "title": "IPD management",
        "body": "Admission details, doctor assignment, nursing records, daily clinical notes, procedures, patient transfers and the discharge summary — one continuous admitted-patient record."
      },
      {
        "num": "02",
        "title": "Bed and ward management",
        "body": "Available, occupied and reserved beds, ward allocation, room categories and transfers, visible live instead of reconstructed by phone call."
      },
      {
        "num": "03",
        "title": "Pharmacy",
        "body": "Medicine inventory, stock levels, purchase records, issue against prescription, expiry tracking, billing and low-stock alerts."
      },
      {
        "num": "04",
        "title": "Laboratory",
        "body": "Test booking, sample collection, test status, result entry, report generation, doctor access and patient report history."
      },
      {
        "num": "05",
        "title": "Billing and payments",
        "body": "Structured bills across consultation, admission, room, procedures, pharmacy, laboratory and other services, with discounts, pending balances and receipts tracked."
      },
      {
        "num": "06",
        "title": "Management dashboard",
        "body": "Daily OPD count, current admissions, available beds, upcoming discharges, pharmacy and lab workload, collections and department-wise activity — without waiting for manual reports."
      }
    ],
    "audienceKicker": "Who it is built for",
    "audienceTitle": "From a single doctor to a healthcare group.",
    "audience": [
      {
        "title": "Individual doctors and general clinics",
        "body": "The essential OPD modules, running on a laptop and a phone, with no IT overhead."
      },
      {
        "title": "Dental, physiotherapy and paediatric clinics",
        "body": "Treatment-plan and repeat-visit workflows where follow-up is the core of the practice."
      },
      {
        "title": "Gynaecology, orthopaedic, dermatology and eye clinics",
        "body": "Speciality-specific consultation fields and document handling."
      },
      {
        "title": "Diagnostic centres",
        "body": "Test-led workflows with report delivery and controlled document access."
      },
      {
        "title": "Multi-speciality clinics",
        "body": "Department and doctor-wise appointments with consolidated reporting for management."
      },
      {
        "title": "Hospitals and healthcare groups",
        "body": "Full HMS with IPD, pharmacy, laboratory, billing and multi-branch structure."
      }
    ],
    "startTitle": "What we ask before recommending anything.",
    "startIntro": "No two practices run the same way, so the scope comes from your answers, not a package list:",
    "startItems": [
      "Number of doctors, staff and daily patient volume",
      "Whether you admit patients overnight",
      "How appointments reach you today",
      "Your current prescription and payment process",
      "Existing patient records and how they are stored",
      "Number of branches, and expansion plans"
    ],
    "startNote": "HMS is delivered in phases: OPD, registration, appointments, prescriptions and basic billing first; then IPD, beds and nursing; then pharmacy, laboratory, inventory, advanced reporting and multi-branch. Phasing keeps training manageable and operations undisrupted.",
    "startCta": "Review my workflow",
    "faqs": [
      {
        "id": "md1",
        "q": "What is the difference between the OPD system and HMS?",
        "a": "The OPD system covers outpatient work: website, appointments, patient records, prescriptions, follow-ups and payments. HMS includes all of that and adds admitted-patient management — IPD, beds and wards, pharmacy, laboratory, hospital-wide billing and separate access for every staff role. If you do not admit patients, you do not need HMS."
      },
      {
        "id": "md2",
        "q": "Can we begin with only a few modules?",
        "a": "Yes, and we usually recommend it. Start with the essentials, let staff settle in, then add modules in phases. It keeps the cost lower, the training simpler and the disruption minimal."
      },
      {
        "id": "md3",
        "q": "Can doctors create digital prescriptions?",
        "a": "Yes. Authorised doctors get a structured screen for medicines, dosage, frequency, duration, tests advised, general advice and follow-up date — printed or shared through your approved process."
      },
      {
        "id": "md4",
        "q": "Can staff members have different access levels?",
        "a": "Yes. Doctors, nurses, receptionists, pharmacists, laboratory staff, accounts, administrators and management can each be given different permissions, so clinical information is not visible to everyone."
      },
      {
        "id": "md5",
        "q": "Does the system replace professional medical judgement?",
        "a": "No. It is an administrative and clinical documentation tool. Medical decisions must always be made by appropriately qualified healthcare professionals."
      },
      {
        "id": "md6",
        "q": "Is it automatically compliant with every healthcare regulation?",
        "a": "No. Compliance depends on your organisation, the system configuration, how data is used, the hosting arrangement, integrations and the laws that apply to you. We assess the relevant requirements with you before deployment rather than claiming blanket compliance."
      },
      {
        "id": "md7",
        "q": "Can it be used on mobile?",
        "a": "Yes. It is built as a responsive web application, so doctors and staff can work from a phone or tablet as well as the reception desktop."
      }
    ],
    "ctaTitle": "Let's understand your workflow first.",
    "ctaBody": "We do not force every clinic or hospital into the same fixed structure. Tell us how you work today and we will recommend the right OPD or HMS scope — in writing, before any commitment."
  }
};
