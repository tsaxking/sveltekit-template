# src/lib/services

Services are systems that maintain their own state and provide functionality to other parts of the application. They often interact with external resources such as APIs, databases, or other services. Services are typically long-lived and designed to be reusable and modular, allowing them to be easily integrated into different parts of the application, however this is not always the case.

## Conventions

- If a service requires singleton behavior, (i.e. only one instance should exist throughout the application), it must be implemented using the singleton pattern:

```ts
export default new (class MyService {
	// service implementation
})();
```

Or:

```ts
class MyService {
	private static instance: MyService;

	constructor() {
		// private constructor to prevent direct instantiation
		if (MyService.instance) throw new Error('More than one instance of MyService created');
		MyService.instance = this;
	}

	init() {
		// initialization code
	}
}
const myService = new MyService();
// do any initialization here
myService.init();
export default myService;
```

- Services that do not require singleton behavior can be implemented as regular classes or modules. (View `src/lib/services/struct/index.ts` for an example of a non-singleton service).
