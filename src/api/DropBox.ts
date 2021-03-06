import { CacheName } from "./ValueContainer";

declare const unsafeWindow: Window;

const OAUTH2_CALLBACK = "ffe-oauth2-cb";
const REDIRECT_URI = "https://www.fanfiction.net/ffe-oauth2-return";
const CLIENT_ID = "ngjdgcbyh9cq080";

const BEARER_TOKEN_KEY = "ffe-dropbox-token";
const FFE_DATA_PATH = "/ffe.json";

export interface SynchronizerUpdateCallback<T> {
  (key: string, value: T): Promise<any> | any;
}

export interface Synchronizer {
  isAuthorized(): Promise<boolean>;

  authorize(): Promise<void>;

  synchronize(): Promise<void>;

  onValueUpdate(callback: SynchronizerUpdateCallback<any>): symbol;

  removeValueUpdateCallback(key: symbol): void;
}

export class DropBox implements Synchronizer {
  private valueUpdateCallbacks: {
    [key: string]: SynchronizerUpdateCallback<any>;
  } = {};

  public async isAuthorized(): Promise<boolean> {
    return !!(await GM.getValue(BEARER_TOKEN_KEY));
  }

  public async authorize(): Promise<void> {
    const token = (await new Promise((resolve, reject) => {
      (unsafeWindow as any)[OAUTH2_CALLBACK as any] = (callbackToken: string) => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        clearInterval(handle);
        resolve(callbackToken);
      };

      const popup = xwindow(
        `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${encodeURIComponent(
          CLIENT_ID
        )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
        775,
        550
      );

      const handle = setInterval(() => {
        if (popup.closed) {
          clearInterval(handle);
          reject(new Error("Authorization aborted by user"));
        }
      }, 1000);
    })) as string;

    await GM.setValue(BEARER_TOKEN_KEY, token);
  }

  public async synchronize(): Promise<void> {
    console.log("Synchronizing data with DropBox");
    const rawData = await this.readFile(FFE_DATA_PATH);
    const remoteData = rawData ? JSON.parse(rawData) : {};

    await Promise.all(
      Object.keys(remoteData).map(async (key) => {
        if (CacheName.isTimestampKey(key)) {
          return;
        }

        const localTimestamp = +((await GM.getValue(`${key}+timestamp`)) ?? 0);
        const remoteTimestamp = +remoteData[`${key}+timestamp`];

        if (localTimestamp < remoteTimestamp) {
          await Promise.all(
            Object.getOwnPropertySymbols(this.valueUpdateCallbacks)
              .map((sym) => this.valueUpdateCallbacks[sym as any](key, remoteData[key]))
              .filter((promise) => promise && promise.then)
          );
        }
      })
    );

    let hasUpdate = false;
    await Promise.all(
      (
        await GM.listValues()
      ).map(async (key) => {
        if (CacheName.isTimestampKey(key)) {
          return;
        }

        const localTimestamp = +((await GM.getValue(`${key}+timestamp`)) ?? 0);
        const remoteTimestamp = +remoteData[`${key}+timestamp`] || 0;
        if (localTimestamp > remoteTimestamp) {
          hasUpdate = true;
          remoteData[key] = JSON.parse((await GM.getValue(key)) as string);
          remoteData[`${key}+timestamp`] = localTimestamp;
        }
      })
    );

    if (hasUpdate) {
      await this.saveFile(FFE_DATA_PATH, remoteData);
    }
  }

  public onValueUpdate<T>(callback: SynchronizerUpdateCallback<T>): symbol {
    const key = Symbol("value-update-key");
    this.valueUpdateCallbacks[key as any] = callback;

    return key;
  }

  public removeValueUpdateCallback(key: symbol): void {
    delete this.valueUpdateCallbacks[key as any];
  }

  private readFile(path: string): Promise<any> {
    return this.content("/files/download", {
      path,
    });
  }

  private saveFile(path: string, content: any): Promise<any> {
    return this.content(
      "/files/upload",
      {
        path,
        mode: "overwrite",
        mute: true,
      },
      content
    );
  }

  private async content(url: string, params: any, body?: any): Promise<string | undefined> {
    if (!(await this.isAuthorized())) {
      throw new Error("Not authorized with DropBox yet.");
    }

    const token = await GM.getValue(BEARER_TOKEN_KEY);
    const fmtUrl = `https://content.dropboxapi.com/2${url}?arg=${encodeURIComponent(JSON.stringify(params))}`;
    console.debug("%c[DropBox] %cPOST %c%s", "color: gray", "color: blue", "color: inherit", fmtUrl);

    const response = await fetch(fmtUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const msg = await response.json();
      if (response.status === 409 && msg.error_summary.startsWith("path/not_found/")) {
        // File doesn't exist yet after first connection. Simply ignore and push all changes.
        return undefined;
      }

      throw new Error(msg.error_summary);
    }

    return response.text();
  }

  private async rpc(url: string, body?: any): Promise<any> {
    if (!(await this.isAuthorized())) {
      throw new Error("Not authorized with Dropbox yet.");
    }

    const token = await GM.getValue(BEARER_TOKEN_KEY);
    const fmtUrl = `https://api.dropboxapi.com/2${url}`;
    console.debug("%c[DropBox] %cPOST %c%s", "color: gray", "color: blue", "color: inherit", fmtUrl);

    const response = await fetch(fmtUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: body ? JSON.stringify(body) : "null",
    });

    return response.json();
  }
}

export function oAuth2LandingPage(): void {
  // This function will be executed inside the child popup window receiving the OAuth token.
  const target = document.body.firstElementChild;
  if (target) {
    target.innerHTML = "<h2>Received oAuth2 token</h2>This page should close momentarily.";
  }

  const token = /[?&#]access_token=([^&#]*)/i.exec(window.location.hash)?.[1];
  window.opener[OAUTH2_CALLBACK](token);
  window.close();
}
