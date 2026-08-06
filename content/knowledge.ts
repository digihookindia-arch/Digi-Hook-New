// Generated from the design prototype — titles are final and approved, carried
// across verbatim. Knowledge Hub index — the writing schedule.
//
// `status` and `href` are state, not copy: an article gains a href and flips to
// "Live" when it ships. Titles are never edited here.

import { routes } from './navigation';

export const articles: {
  cat: string;
  title: string;
  status: string;
  href?: string;
}[] = [
  {
    "cat": "Performance",
    "title": "Why your website is slow — and what actually fixes it",
    "status": "Live",
    "href": routes.article
  },
  {
    "cat": "Technology",
    "title": "Next.js or WordPress: how to decide without a developer's opinion",
    "status": "Live",
    "href": routes.articleStack
  },
  {
    "cat": "Cost",
    "title": "What a website should actually cost in India, and why quotes differ 10x",
    "status": "Live",
    "href": routes.articleCost
  },
  {
    "cat": "Search",
    "title": "How AI assistants read your website — and why structure now beats keywords",
    "status": "Commissioned"
  },
  {
    "cat": "Security",
    "title": "The five things that get small business websites hacked",
    "status": "Commissioned"
  },
  {
    "cat": "Ecommerce",
    "title": "Where online stores lose customers, measured step by step",
    "status": "Commissioned"
  },
  {
    "cat": "Process",
    "title": "How to brief a website project so it does not go over budget",
    "status": "Commissioned"
  },
  {
    "cat": "Ownership",
    "title": "Who owns your website? A checklist before you pay the final invoice",
    "status": "Commissioned"
  }
];
