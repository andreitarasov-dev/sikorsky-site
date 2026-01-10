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
  }
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

## TypeScript Support

Add the virtual module types to your `src/env.d.ts`:

```typescript
/// <reference types="@sikorsky/site/src/virtual" />
```

## License

MIT
