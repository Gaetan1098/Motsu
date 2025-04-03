# Motsu - Subtitle Translator Chrome Extension

Motsu is a Chrome extension that allows users to translate and save subtitles from Netflix and YouTube in real-time. The extension offers an intuitive interface to select a native language and a language to learn, helping users improve their language skills while watching videos.

## Features

- **Real-Time Subtitle Translation**: Automatically translates subtitles from Netflix and YouTube into the selected learning language.
- **Language Selection**: Users can choose their native language and the language they want to learn.
- **Save Translated Subtitles**: Translated subtitles are saved in a Firebase database for future use.
- **Seamless Subtitle Display**: Subtitles are synchronized with video playback and displayed on the screen in the selected language.

## Installation

1. Clone the repository or download the project files.
2. Open Chrome and navigate to the `chrome://extensions/` page.
3. Enable **Developer Mode** in the top right corner.
4. Click **Load unpacked** and select the project folder.
5. The extension is now ready for use.

## Usage

- Click on the Motsu extension icon in the Chrome toolbar.
- Choose your **native language** and the **language to learn** from the dropdown menus.
- Visit Netflix or YouTube and start watching videos with subtitles.
- The translated subtitles will appear in real-time, synchronized with the video.
- You can save the translated subtitles to Firebase for future use.

## Firebase Setup

1. Create a Firebase project by visiting [Firebase Console](https://console.firebase.google.com/).
2. Obtain your Firebase credentials and update the `firebaseConfig` object in the `background.js` file with your project details.
3. Make sure your Firebase Firestore and Realtime Database rules are configured to allow appropriate read and write access.

## Contributing

Feel free to contribute to the project by forking the repository, creating a new branch, and submitting a pull request. Contributions and suggestions are welcome!

## License

This project is licensed under the MIT License.
