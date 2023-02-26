declare module '@sagi.io/workers-slack';

type SlackRESTClient = {
    views: {
        publish: (any) => any
    },
    chat: {
        postMessage: (any) => any
    }
    helpers: {
        verifyRequestSignature: (any, string) => Promise<boolean> | Error
    }
}