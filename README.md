# Basic React Template

To get started:

- npm install
- npm run start

# Github Pages

This repo uses an action workflow to automatically deploy anything pushed to the main or master branch.

To setup, you must:

- Open `vite.config.ts` and edit the `base` property to read `/<your-repo-name>/`
- In Github, go to your repo > Settings > Pages > Build and Deployment and under the Source dropdown, choose Github Actions

# Assets

Drop your assets under the public folder, which is accessed in paths with a leading forward slash e.g `'/models/my-model.fbx'`
