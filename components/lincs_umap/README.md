# lincs-umap

LINCS UMAP Page

## Development

This is a standalone react component meant to be importable into other applications. A demo application should, however, be devized to test the component in `public/demo.js`. The component itself should be developed in `src/*` and export itself in `src/index.js`.

### Getting Started
```bash
npm install
```

### Running in development
```bash
npm run dev
```

And visit <http://localhost:1234>.

### Installing new dependencies

#### NPM dependencies
```
# Install a npm dependency necessary for the component to function
npm install --save <depname>

# Install a npm *development* dependency necessary for testing or building the component 
npm install --save-dev <depname>
```

## Deployment

### Build for deployment
```bash
npm run build

# Either publish on npm or on github
```

### Use in another react project
```bash
npm install --save <github-or-directory-of-this-project>
```

Use it similarly to how it is used in `public/demo.js`
```jsx
import LINCSUMAP from 'lincs_umap'

// ...
(
  <LINCSUMAP ...props />
)
// ...
```
