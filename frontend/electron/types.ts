export interface QEMSAPI {
  files: {
    open: (options?: any) => Promise<string[] | undefined>;
    save: (options?: any) => Promise<string | undefined>;
  };
  clipboard: {
    readImage: () => Promise<string | undefined>; // Returns data URI of the image
  };
  notifications: {
    show: (title: string, body: string) => Promise<void>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
}

declare global {
  interface Window {
    qems?: QEMSAPI;
  }
}
