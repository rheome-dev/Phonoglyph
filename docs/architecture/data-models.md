# Data Models

## User

* **Purpose:** Represents authenticated users in the system (managed by Supabase Auth).
* **TypeScript Interface:**
    ```typescript
    interface User {
      id: string; // UUID from Supabase auth.users
      email: string;
      user_metadata: {
        name?: string;
        avatar_url?: string;
      };
      created_at: string; // ISO timestamp
      updated_at: string; // ISO timestamp
    }
    ```

## Project

* **Purpose:** Represents a user's visualization project.
* **TypeScript Interface:**
    ```typescript
    interface Project {
      id: string;
      userId: string; // UUID referencing auth.users.id
      name: string;
      midiFilePath: string;
      audioFilePath?: string;
      userVideoPath?: string; // For overlay mode
      renderConfiguration: Record<string, any>; // JSONB field
      createdAt: Date;
      updatedAt: Date;
    }
    ```
