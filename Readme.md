# Tauri Auto-Updater Serverless Function

This project provides a Vercel serverless function that serves as an update server for Tauri applications. It fetches the latest release information from a GitHub repository and provides it in a format compatible with Tauri's auto-updater.

## Setup

1. Fork or clone this repository.

2. Deploy the project to Vercel:
    - Connect your GitHub repository to Vercel.
    - During deployment, set the following environment variables:
        - `OWNER`: Your GitHub username or organization name
        - `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope

3. Once deployed, you'll get a URL for your serverless function. Use this URL in your Tauri application's update configuration.

## Usage in Your Tauri App

1. In your Tauri app's `tauri.conf.json`, configure the updater to use your Vercel function URL:

   ```json
   {
     "tauri": {
       "updater": {
         "active": true,
         "endpoints": [
           "https://your-vercel-function-url.vercel.app/api/update?repository=your-repo-name&platform={{target}}&current_version={{current_version}}"
         ],
         "dialog": true,
         "pubkey": "your-public-key-here"
       }
     }
   }


* Replace your-vercel-function-url.vercel.app with your actual Vercel function URL, and your-repo-name with the name of your GitHub repository.

* Make sure your GitHub releases follow the expected format

* Use semantic versioning for your tags (e.g., v1.0.0).
Include the appropriate assets:

- For Linux: your-app-name_amd64.AppImage.tar.gz
- For macOS: your-app-name.app.tar.gz
- For Windows: your-app-name_x64_en-US.msi.zip


###  Optionally include signature files with .sig extension.


The updater will check for updates when your Tauri app starts. If a new version is available, it will prompt the user to update.

###  Customization

The PLATFORMS constant in the code defines which file extensions correspond to which platforms. Modify this if your asset naming convention differs.
The function caches responses for 5 minutes to avoid excessive GitHub API calls. Adjust the 5 * 60 * 1000 value in the code if you need a different cache duration.