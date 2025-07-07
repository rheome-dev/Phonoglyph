# Requirements

## Functional

* **FR1**: Users must be able to upload a valid MIDI file.
* **FR2**: Users must be able to optionally upload an audio file (.mp3, .wav) to sync with the MIDI visualization.
* **FR3**: The system must provide a real-time, low-resolution preview of the visualization in the editor.
* **FR4**: Users must be able to select from predefined visualization styles.
* **FR5**: Users must be able to select from predefined color schemes.
* **FR6**: All users, including guests, must be able to create custom color schemes.
* **FR7**: Authenticated users must be able to initiate a high-resolution video render from the backend.
* **FR8**: Users must receive real-time progress updates for their render jobs.
* **FR9**: Users must be able to download the completed video file.
* **FR10**: Guest users must be required to sign up or log in before downloading a final rendered video.
* **FR11**: The system must support Stripe integration for subscription payments.

## Non Functional

* **NFR1**: The backend rendering pipeline must target a completion time of less than 2 minutes for MIDI files up to 3 minutes in duration and 5MB in size.
* **NFR2**: The platform must be architected to handle at least 100 concurrent render jobs.
* **NFR3**: The user interface must be responsive and functional on modern web browsers on desktop and mobile.
