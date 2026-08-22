// @ts-nocheck

const {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Query,
} = Appwrite;


// ==========================================
// CONFIG
// ==========================================

function getAppwriteConfig() {
  return {
    endpoint: document
      .getElementById("awEndpoint")
      .value
      .trim(),

    projectId: document
      .getElementById("awProjectId")
      .value
      .trim(),

    databaseId: document
      .getElementById("awDatabaseId")
      .value
      .trim(),

    filesCollectionId: document
      .getElementById("awFilesCollectionId")
      .value
      .trim(),

    bucketId: document
      .getElementById("awBucketId")
      .value
      .trim(),
  };
}


// ==========================================
// APPWRITE CLIENT
// ==========================================

function createAppwriteClient() {
  const config = getAppwriteConfig();

  if (!config.endpoint || !config.projectId) {
    throw new Error(
      "Appwrite endpoint and project ID are required."
    );
  }

  const client = new Client();

  client
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    config,
  };
}


// ==========================================
// RESOLVE FILE
// ==========================================

async function resolveFile(fileId) {
  const {
    databases,
    config,
  } = createAppwriteClient();

  const result =
    await databases.listDocuments(
      config.databaseId,
      config.filesCollectionId,
      [
        Query.equal(
          "fileID",
          fileId
        ),
      ]
    );

  if (result.documents.length === 0) {
    const error =
      new Error(
        `File not found: ${fileId}`
      );

    error.code = 404;

    throw error;
  }

  return result.documents[0];
}




async function register(email, password) {
  const {
    account,
  } = createAppwriteClient();

  const user =
    await account.create(
      ID.unique(),
      email,
      password
    );

  return {
    status: 201,

    body: {
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        createdAt: user.$createdAt,
      },
    },
  };
}




async function login(email, password) {
  const {
    account,
  } = createAppwriteClient();

  const session =
    await account.createEmailPasswordSession(
      email,
      password
    );

  const user =
    await account.get();

  return {
    status: 200,

    body: {
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
      },

      session: {
        id: session.$id,
        expiresAt: session.expire,
      },
    },
  };
}




async function logout() {
  const {
    account,
  } = createAppwriteClient();

  await account.deleteSession(
    "current"
  );

  return {
    status: 200,

    body: {
      message:
        "Logged out successfully",
    },
  };
}


async function getMe() {
  const {
    account,
  } = createAppwriteClient();

  const user =
    await account.get();

  return {
    status: 200,

    body: {
      user: {
        id: user.$id,

        email: user.email,

        fullName:
          user.name || null,

        displayName:
          user.prefs?.displayName || null,

        bio:
          user.prefs?.bio || null,

        role:
          user.prefs?.role || "user",

        createdAt:
          user.$createdAt,
      },
    },
  };
}



async function getFiles() {
  const {
    account,
    databases,
    config,
  } = createAppwriteClient();

  const user =
    await account.get();

  const result =
    await databases.listDocuments(
      config.databaseId,
      config.filesCollectionId,
      [
        Query.equal(
          "ownerId",
          user.$id
        ),
      ]
    );

  return {
    status: 200,

    body: {
      files:
        result.documents.map(
          (file) => ({
            id:
              file.fileId,

            ownerId:
              file.ownerId,

            fileName:
              file.fileName,

            mimeType:
              file.mimeType,

            sizeBytes:
              file.sizeBytes,

            uploadedAt:
              file.uploadedAt ||
              file.$createdAt,
          })
        ),
    },
  };
}



async function getFileById(fileId) {
  const {
    account,
  } = createAppwriteClient();

  const user =
    await account.get();

  const file =
    await resolveFile(fileId);

  if (
    file.ownerId !== user.$id
  ) {
    const error =
      new Error(
        "You do not have access to this file."
      );

    error.code = 403;

    throw error;
  }

  return {
    status: 200,

    body: {
      file: {
        id:
          file.fileId,

        ownerId:
          file.ownerId,

        fileName:
          file.fileName,

        mimeType:
          file.mimeType,

        sizeBytes:
          file.sizeBytes,

        uploadedAt:
          file.uploadedAt ||
          file.$createdAt,
      },
    },
  };
}




async function downloadFileById(fileId) {
  const {
    account,
    storage,
    config,
  } = createAppwriteClient();

  const user =
    await account.get();

  // Resolve metadata
  const file =
    await resolveFile(fileId);

  // Verify ownership
  if (
    file.ownerId !== user.$id
  ) {
    const error =
      new Error(
        "You do not have access to this file."
      );

    error.code = 403;

    throw error;
  }

  // Find the actual Storage file
  // using the filename stored in metadata.
  const storageResult =
    await storage.listFiles(
      config.bucketId,
      [
        Query.equal(
          "name",
          file.fileName
        ),
      ]
    );

  if (
    storageResult.files.length === 0
  ) {
    const error =
      new Error(
        `Storage file not found: ${file.fileName}`
      );

    error.code = 404;

    throw error;
  }

  const storageFile =
    storageResult.files[0];

  const downloadUrl =
    storage.getFileDownload(
      config.bucketId,
      storageFile.$id
    );

  // Navigate directly to the
  // Appwrite download endpoint.
  window.location.href =
    downloadUrl;

  return {
    status: 200,

    body: {
      message:
        "File download triggered.",

      fileId:
        file.fileID,

      fileName:
        file.fileName,
    },
  };
}




window.appwriteAdapter = {
  register,
  login,
  logout,
  getMe,
  getFiles,
  getFileById,
  downloadFileById,
};
