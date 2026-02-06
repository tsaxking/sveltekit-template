# Mjml

This directory contains the MJML components used to generate responsive email templates. MJML (Mailjet Markup Language) is a markup language designed to simplify the process of creating responsive email layouts.

## Dynamic Templates

This project utilizes [html-constructor](https://github.com/tsaxking/html-constructor) to create dynamic MJML templates. This allows for the generation of email templates that can adapt to different content and layouts based on user input or other variables.

We highly recommend installing [ColorMyText](https://marketplace.visualstudio.com/items?itemName=JatinSanghvi.color-my-text) for highlighting of the html-constructor syntax.

### Usage

To create or modify MJML templates, navigate to the `mjml/` directory. Each template is defined in its own file, where you can use html-constructor to pass in dynamic content.

### Example

Basic variables:

```html
<mjml>
	<mj-body>
		<mj-section>
			<mj-column>
				<mj-text>
					<!-- user-defined variable called "name" -->
					Hello, {{ name }}!
				</mj-text>
			</mj-column>
		</mj-section>
	</mj-body>
</mjml>
```

Loops:

```html
<mjml>
	<mj-body>
		<mj-section>
			<mj-column>
				<mj-text>
					<!-- user-defined array called "items" each with the property "name" -->
					<ul>
						<repeat id="items"> <li>{{ name }}</li></repeat>
					</ul>
				</mj-text>
			</mj-column>
		</mj-section>
	</mj-body>
</mjml>
```

Conditionals:

```html
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
            <!-- user-defined boolean called "isMember" -->
          <if condition="isMember">
            Welcome back, valued member!
          <else>
            Please consider joining our membership program.
          </if>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

File nesting:

```html
<mjml>
	<mj-body>
		<mj-section>
			<mj-column>
				<mj-text>
					<!-- Including another MJML file called "header.mjml" and passing in an object named "header" -->
					<file src="header" id="header" />
				</mj-text>
			</mj-column>
		</mj-section>
	</mj-body>
</mjml>
```

Switch statements:

```html
<mjml>
	<mj-body>
		<mj-section>
			<mj-column>
				<mj-text>
					<!-- user-defined variable called "userType" -->
					<switch id="userType">
						<case value="admin"> Welcome, Admin User! </case>
						<case value="member"> Welcome, Member User! </case>
						<default> Welcome, Guest User! </default>
					</switch>
				</mj-text>
			</mj-column>
		</mj-section>
	</mj-body>
</mjml>
```

## Rendering MJML Templates

When rendering, it will create a type file `src/lib/types/email.ts` which will have the types for each email template based on the variables used within them. You can then use these types to ensure that you are passing the correct data when rendering the templates.

To render the MJML templates:

```sh
pnpm build:email
```
