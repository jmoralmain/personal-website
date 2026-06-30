// Pure data — no rendering logic. Jeffrey fills in the empty strings and arrays.
// The about UI module (js/ui/about.js) renders whatever is here.
// Adding a link or bio paragraph = editing this file only. Zero other changes.

export const ABOUT = {
  name:     'Jeffrey Morales',
  location: '',    // e.g. 'Los Angeles, CA'
  tagline:  '',    // e.g. 'Climber. Photographer. Data engineer.'

  bio: [
    // Each string becomes one paragraph. Jeffrey writes these.
    // 'I spend my weekends on rock faces and my weekdays building data infrastructure.',
  ],

  craft: [
    // { label: 'climbing',          detail: 'trad, sport, multi-pitch' },
    // { label: 'photography',       detail: 'landscape, portrait, documentary' },
    // { label: 'data engineering',  detail: 'Spark, dbt, Airflow, GCP' },
  ],

  links: [
    // { label: 'GitHub',    url: 'https://github.com/...' },
    // { label: 'LinkedIn',  url: 'https://linkedin.com/...' },
    // { label: 'Instagram', url: 'https://instagram.com/...' },
    // { label: 'Email',     url: 'mailto:...' },
  ],
};
