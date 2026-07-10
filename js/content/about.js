// Pure data — no rendering logic. Jeffrey fills in the empty strings and arrays.
// The about UI module (js/ui/about.js) renders whatever is here.
// Adding a link or bio paragraph = editing this file only. Zero other changes.

export const ABOUT = {
  name:     'Jeffrey Morales',
  location: 'San Francisco',    // e.g. 'Los Angeles, CA'
  tagline:  'Ellie & Mack'''s Uncle',    // e.g. 'Climber. Photographer. Data engineer.'

  bio: [
    // Each string becomes one paragraph. Jeffrey writes these.
    // 'I spend my weekends on rock faces and my weekdays building data infrastructure.',
    'I began this journey at 25 to find some way to express myself. Finding myself more and more as I go farther outside and deeper inside. Starting here and hoping to see it take me somewhere'
    ''
  ],

  craft: [
    // { label: 'climbing',          detail: 'trad, sport, multi-pitch' },
     { label: 'photography',       detail: 'Nikonos V, Nikon FM2n' },
    // { label: 'data engineering',  detail: 'Spark, dbt, Airflow, GCP' },
  ],

  links: [
    // { label: 'GitHub',    url: 'https://github.com/...' },
    // { label: 'LinkedIn',  url: 'https://linkedin.com/...' },
    // { label: 'Instagram', url: 'https://instagram.com/...' },
     { label: 'Email',     url: 'mailto:jeffreymorales.personal@gmail.com' },
  ],
};
