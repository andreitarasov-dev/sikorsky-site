# @sikorsky/site

A reusable Astro theme package with components, styles, and other features.

## Installation

```bash
npm install @sikorsky/site
```

## Setup

### 1. Create a theme configuration file

Create `theme.config.ts` in your project root:

```typescript
import { defineConfig } from "@sikorsky/site";

export default defineConfig({
  site: {
    name: "Your Name",
    domain: "your-site.com"
  },
  logo: "/logo.png",
  logoAlt: "Your Name logo", // Optional, defaults to "{site.name} logo"
  footer: {
    copyright: "© Your Name, b. 1990",
    decoration: "·㉨·", // Optional decorative element
    email: "you@your-site.com",
    socials: [
      { label: "Telegram", url: "https://t.me/yourhandle" },
      { label: "LinkedIn", url: "https://linkedin.com/in/you" },
      { label: "Instagram", url: "https://instagram.com/you" }
    ]
  },
  head: [ // Optional custom head tags
    {
      tag: "script",
      attrs: {
        defer: true,
        src: "https://stats.domain.site/script.js",
        "data-website-id": "xxx-xxx-xxx-xxx"
      }
    }
  ]
});
```

### 2. Add the integration to your Astro config

```typescript
// astro.config.mjs
import { defineConfig } from "astro/config";
import { themeIntegration } from "@sikorsky/site";
import themeConfig from "./theme.config";

export default defineConfig({
  integrations: [themeIntegration({ config: themeConfig })],
  vite: {
    ssr: {
      noExternal: ["firebase"]
    }
  }
});
```

**Note:** The `vite.ssr.noExternal` configuration is required for Firebase to work properly in SSR mode. This ensures Firebase is bundled during server-side rendering rather than being treated as an external dependency.

### 3. Set up Firebase (for the like system)

Create a `.env` file with your Firebase credentials:

```env
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
PUBLIC_FIREBASE_PROJECT_ID=your-project
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Note:** The integration automatically serves Inter fonts from the package during development and includes them in the build output.

## Usage

### Using the Layout component

```astro
---
import Layout from "@sikorsky/site/components/Layout.astro";
---

<Layout title="My Page" description="Page description" pageId="my-page">
  <h1 id="title">My Page</h1>
  <p>Content goes here...</p>
</Layout>
```

The `pageId` prop enables the like button for that page.

## Use Cases

### Basic Page

A simple page with title and content:

```astro
---
import Layout from "@sikorsky/site/components/Layout.astro";
---

<Layout title="About me" description="Learn more about me">
  <header>
    <h1 id="title">About me</h1>
    <h2>Brief introduction or subtitle</h2>
  </header>
  <section>
    <p>Your content here...</p>
  </section>
</Layout>
```

### Homepage with Multiple Sections

A homepage with various content sections:

```astro
---
import Layout from "@sikorsky/site/components/Layout.astro";
---

<Layout title="Your Name" description="Your description">
  <div class="index-page">
    <header>
      <h1 id="title">Your Name</h1>
      <h2>Your tagline or introduction</h2>
    </header>
    
    <section id="experience">
      <h3>Professional Experience</h3>
      <ul>
        <li>
          <div>
            <strong>Role, <span class="secondary">Company, Year</span></strong>
          </div>
        </li>
      </ul>
    </section>
    
    <section id="projects">
      <h3>My Projects</h3>
      <ul>
        <li>
          <div class="link-caption-wrapper">
            <div class="link-block">
              <a href="/project" class="link">Project Name</a>
            </div>
            <div class="caption" tabindex="0">Project description</div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</Layout>
```

### Case Study Page with Metadata and Images

A detailed case study page with metadata, images, and like button:

```astro
---
import { Image } from "astro:assets";
import Layout from "@sikorsky/site/components/Layout.astro";
import projectImage from "../images/project.png";
import companyLogo from "../images/logo.png";
---

<Layout 
  title="Project Title" 
  description="Brief project description"
  pageId="project-slug"
>
  <div class="metadata">
    <div><img src={companyLogo.src} alt="Company" width={32} height={32} /></div>
    <div>
      <a href="https://company.com" target="_blank" class="link">Company Name</a>
      ·
      <time datetime="2024-01-01">Jan 2024 – Mar 2024</time>
      · <span class="tags">Category, Tag</span>
    </div>
  </div>
  
  <header>
    <h1 id="title">Project Title</h1>
    <h2>Project subtitle or brief description</h2>
  </header>
  
  <section>
    <ul class="list-with-secondary-items">
      <li>
        <span class="secondary">My role:</span> Product Designer
      </li>
      <li>
        <span class="secondary">Deliverables:</span> UI/UX, Research
      </li>
      <li><span class="secondary">Platforms:</span> Web, Mobile</li>
    </ul>
  </section>
  
  <section>
    <p>
      <Image src={projectImage} alt="Project screenshot" class="image full" />
      <span class="caption secondary">Image caption</span>
    </p>
  </section>
  
  <section>
    <h2>Context</h2>
    <p>Your content here...</p>
  </section>
</Layout>
```

### Content Page with Metadata

A content page with update metadata:

```astro
---
import Layout from "@sikorsky/site/components/Layout.astro";
---

<Layout title="What I'm up to" description="Current updates">
  <div class="metadata">
    <time datetime="2024-12-27">Updated December 27, 2024</time>
  </div>
  
  <header>
    <h1 id="title">What I'm up to</h1>
  </header>
  
  <section>
    <h2>Current Focus</h2>
    <p>Your updates here...</p>
  </section>
</Layout>
```

### Page with Like Button

Enable the like button by providing a `pageId`:

```astro
---
import Layout from "@sikorsky/site/components/Layout.astro";
---

<Layout 
  title="My Article" 
  description="Article description"
  pageId="my-article"
>
  <header>
    <h1 id="title">My Article</h1>
  </header>
  <section>
    <p>Article content...</p>
  </section>
</Layout>
```

### Available Components

- `Layout` - Main layout with nav, footer, and optional like button
- `Nav` - Navigation with logo and breadcrumbs
- `Breadcrumbs` - Breadcrumb navigation with scroll-based visibility
- `LikeButton` - Firebase-powered like button with animations
- `Card` - Link card component

## Custom Head Tags

You can inject custom tags into the document `<head>` section via the `head` configuration option. This is useful for adding analytics scripts, custom meta tags, or other third-party integrations.

### Adding Analytics Scripts

```typescript
export default defineConfig({
  // ... other config
    head: [ // Optional custom head tags
        {
            tag: "script",
            attrs: {
                defer: true,
                src: "https://stats.domain.site/script.js",
                "data-website-id": "xxx-xxx-xxx-xxx"
            }
        }
    ]
});
```

### Adding Custom Meta Tags

```typescript
export default defineConfig({
  // ... other config
  head: [
    {
      tag: "meta",
      attrs: {
        property: "og:type",
        content: "website"
      }
    },
    {
      tag: "meta",
      attrs: {
        name: "twitter:card",
        content: "summary_large_image"
      }
    }
  ]
});
```

### Adding Inline Scripts or Styles

```typescript
export default defineConfig({
  // ... other config
  head: [
    {
      tag: "script",
      content: "console.log('Custom inline script');"
    },
    {
      tag: "style",
      content: ".custom-class { color: red; }"
    }
  ]
});
```

### HeadTag Interface

Each head tag object supports the following properties:

- `tag` (required): HTML tag name. Allowed values: `script`, `link`, `meta`, `style`, `base`, `noscript`
- `attrs` (optional): Object with tag attributes as key-value pairs. Supports strings, numbers, and booleans.
- `content` (optional): Inner HTML content for tags like `<script>` or `<style>`

### Security Notes

⚠️ **Important Security Considerations:**

- The `head` configuration is processed at **build time**, not runtime
- Only add tags from **trusted sources** (your own analytics, verified third-party scripts)
- The `content` field uses raw HTML injection - only use with content you control
- Allowed tags are restricted to common head elements for safety
- Never expose this configuration to user input or external APIs

## TypeScript Support

Add the virtual module types to your `src/env.d.ts`:

```typescript
/// <reference types="@sikorsky/site/virtual" />
```

## License

MIT

## Maintainer workflow

Andrei maintains the theme. Both consumer repositories keep their own content,
lockfiles, and deployment schedule. Use Node 22 (`nvm install && nvm use`) and run
`npm ci` in this repository and both websites before starting local preview.

### Edit and preview both websites

With all three checkouts in the same parent directory:

```sh
npm run dev:sites
```

Andrei: http://127.0.0.1:4321 — Pavel: http://127.0.0.1:4322.
For other locations:

```sh
npm run dev:sites -- --andrei /path/to/andreitarasov.dev --pavel /path/to/sikorsky.design
```

Both sites need the local-theme development configuration introduced alongside this
workflow. Shared CSS and components reload live. Restart after changing integration
or theme configuration. The consumer resolves the local integration with Vite and
uses an ignored `.astro/local-theme` cache link for Astro 4 component paths. Neither
consumer's dependencies nor lockfile is rewritten. Ctrl-C stops both server process
groups. Missing checkouts, missing dependencies, and occupied ports fail early.
Do not export `SIKORSKY_THEME_DIR` globally; production builds reject the override.

### Validate what npm will ship

```sh
npm test
npx playwright install chromium
npm run check:consumers
```

The same path flags work for validation. This packs the theme, installs the actual
tarball in disposable copies of both websites and the fixture, builds production
output, and runs browser checks. It strips Firebase environment variables and does
not copy `.env` files. Fixture likes use a local adapter, never a real database.
Do not put credentials in source files.

Artifacts are retained under `.artifacts/sikorsky-check-*/`: the exact tarball, logs,
and `validation.json` with source revisions, dirty-state flags, and a SHA-256 digest.
Use `--artifact-dir /path/to/evidence` for a chosen location. Successful temporary
consumer copies are removed; failed copies remain at the path printed in the error.
Remove that printed temporary directory after investigating.

The fixture's screenshot baseline uses macOS and Playwright 1.62.1. CI uses macos-14.
Linux runs need their own reviewed baselines; do not overwrite macOS references.
To deliberately update snapshots, first install the candidate tarball and build in
`fixtures/site`, then run `npm run test:fixture -- --update-snapshots` and inspect the
images. The standard validation command never updates baselines.

CI pins both real consumer revisions in `.github/workflows/check.yml`. Update those
SHAs in a tested commit when the websites change substantially. Validation records the
exact revisions, so package release evidence remains reproducible.

### Release deliberately

1. Update the version with `npm version patch --no-git-tag-version`, add a matching
   `## <version>` entry to `CHANGELOG.md`, and commit both package files and the notes.
2. Commit the tested theme changes to `master` and push after checks pass.
3. Run **Release theme** on `master`, enter the committed version, and leave **publish**
   unchecked for a dry run.
4. After reviewing that run, run it again with **publish** checked. It revalidates,
   verifies the version, commit and tarball digest, and publishes that exact artifact.

No push or PR publishes automatically. Release jobs are serialized. Already-published
versions fail verification, and an npm/network error fails closed. If publication
succeeds but a later action fails, check npm before retrying; choose a new patch version
for corrections rather than replacing a published version.

One-time account setup: the npm owner must configure a trusted GitHub publisher for
`andreitarasov-dev/sikorsky-site`, workflow `release.yml`, environment `npm`. Create that
GitHub environment and restrict deployment branches to `master`; optional reviewers
can provide another release gate. This configuration is not created by committing YAML.
No npm write token is required. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

### Upgrade both websites without PRs

```sh
npm run upgrade:sites -- --version 0.5.4
```

Supply an exact published version. Optional `--andrei` and `--pavel` paths work as
with the other commands. Both sites must have clean `main` checkouts. The command
installs the exact version, runs production builds and full browser suites sequentially,
and commits only `package.json` and `package-lock.json` after both sites pass.
It never rewrites snapshots or pushes. Review both commits, then push each `main`
branch to deploy. If validation fails, no dependency commits are made; inspect the
retained changes. Restore the two dependency files and run `npm ci` in each site
before retrying from clean checkouts. A git commit failure can leave the first site
committed; the command reports which commits succeeded. Nothing is reset automatically.

To roll back a deployed update, revert that site's dependency commit, rerun its build
and tests, and push the revert. The other website can stay on its existing version.
