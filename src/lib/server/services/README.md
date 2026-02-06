# src/lib/server/services

Similar to the front-end, back-end services are systems that maintain their own state and typically are long-lived. They provide functionality to other parts of the application and often interact with external resources such as databases, APIs, or other services. Back-end services are designed to be reusable and modular, allowing them to be easily integrated into different parts of the server-side application.

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
