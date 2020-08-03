/*
  README

  FEATURES:
  ---------------------------------------------------------
  - pagination (use itemsPerPage to controll)
  - simple RWD
  - better readability with clean interface
    & minimalistic design
  - :visited state
  - relative human readable dates

  HINTS:
  ---------------------------------------------------------
  - some functions are missing due to API simplicity
  - JS should be transpiled

  possible TODOs/Extensions (if more resources available):
  ---------------------------------------------------------
  - dark mode
  - sticky Tab Bar with posts types (Story/Job/etc), User
  - any better API?, maybe graphql version
  - simple virtualized list, to gain on scroll performance
  - webpack config, to include transpiling scss
  - pagination in query string
  - SEO optimisations
  - sorting
*/

(async () => {
  const __DEV__ = true;
  const apiUrl = 'https://hacker-news.firebaseio.com/v0';
  const siteDomain = 'https://news.ycombinator.com';
  const itemsPerPage = 10;
  const httpStatusCodes = Object.freeze({
    OK: 200,
  });
  const defaultLinkProps = { target: '_blank', rel: 'nofollow' };
  const domainRegex = /^(?:https?:\/\/)?(?:w{3}\.)?([^:\/\s]+)/;
  const times = [
    ['second', 1],
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2592000],
    ['year', 31536000]
  ];

  let currentPage = 0;
  let latestStoryElement = null;
  let instersectionObserver = null;
  let data = [];
  let totalCount;

  const list = document.querySelector('.list');
  const scrollTrigger = document.getElementById('trigger');

  const getTimeAgo = timestamp => {
    const now = new Date();
    let diff = Math.round((now - timestamp * 1000) / 1000);
    for (let t = 0; t < times.length; t += 1) {
      if (diff < times[t][1]) {
          if (t === 0) {
            return "Just now";
          } else {
            diff = Math.round(diff / times[t - 1][1]);
            return `${diff} ${times[t - 1][0]}${(diff === 1 ? ' ago' : 's ago')}`;
          }
      }
    }
  };

  const isScrolledIntoView = el => {
    const { top, bottom } = el.getBoundingClientRect();
    return top >= 0 && bottom <= window.innerHeight;
  };

  const el = (tagName, attributes, ...children) => {
    const element = document.createElement(tagName);

    for (key in attributes) {
      element.setAttribute(key, attributes[key])
    }

    children.forEach(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });

    return element;
  }

  const renderStory = ({
    id,
    by,
    title,
    score,
    time,
    url: href,
    descendants: comments,
  }) => {
    const timeAgo = getTimeAgo(time);
    const datetime = new Date(time * 1000);
    const author = `@${by}`;
    const [domainUrl, domainName] = href ? href.match(domainRegex) : [];

    const story = el('li', { id, class: 'story' },
      el('div', { class: 'wrapper' },
        el('h2', {},
          el('a', { class: 'title', title, href, ...defaultLinkProps }, title),
        ),
        el('time', { title: datetime, datetime, class: 'meta' }, timeAgo),
        ...(domainUrl && domainName ? [
          el('a', { class: 'meta domain', href: domainUrl, ...defaultLinkProps }, domainName),
        ] : []),
        el('a', {
          class: 'meta author',
          title: author,
          href: `${siteDomain}/user?id=${by}`,
          ...defaultLinkProps,
        }, author),
        el('span', { class: 'meta score_counter', }, `🤍 ${score}`),
        el('a', {
          class: 'meta comments_counter',
          href: `${siteDomain}/item?id=${id}`,
          ...defaultLinkProps,
        }, `💬 ${comments}`),
      ),
    );

    if (!latestStoryElement) {
      list.appendChild(story);
    } else {
      latestStoryElement.parentNode.insertBefore(story, latestStoryElement.nextSibling);
    }

    latestStoryElement = story;
    return story;
  };

  const pickNextPage = () => {
    currentPage += 1;
    return data.splice(0, itemsPerPage);
  }

  const request = async (url, options) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (response.status === httpStatusCodes.OK) return data;
      return new Error(data.error);
    } catch (fetchError) {
      return fetchError;
    }
  };

  const fetchPage = async ids =>
    Promise.all(ids.map(id => request(`${apiUrl}/item/${id}.json`)));

  const intersectionHandler = async ([trigger]) => {
    const stories = await fetchPage(pickNextPage());
    stories.map(renderStory);

    if (isScrolledIntoView(scrollTrigger)) {
      await intersectionHandler([trigger]);
    } else if (totalCount - data.length <= 0 && !!instersectionObserver) {
      instersectionObserver.disconnect();
      trigger.target.parentElement.removeChild(trigger.target);
    }
  }

  data = await request(`${apiUrl}/topstories.json`);

  if (data instanceof Error) {
    if (__DEV__) console.error(fetchError);
    return;
  }

  totalCount = data.length;
  instersectionObserver = new IntersectionObserver(intersectionHandler);
  instersectionObserver.observe(scrollTrigger);
})();
