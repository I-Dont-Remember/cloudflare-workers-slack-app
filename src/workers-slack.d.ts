declare module '@sagi.io/workers-slack';

type SlackRESTClient = {
    views: {
        publish: ({user_id: string, view: string}) => any
    },
    chat: {
        postMessage: (any) => any
    }
    helpers: {
        verifyRequestSignature: (Request, string) => Promise<boolean> | Error
    }
}