import { defineConfig } from "vite";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import handlebars from "vite-plugin-handlebars";

export default defineConfig({
	plugins: [
		tailwindcss(),
		handlebars({
			partialDirectory: resolve(__dirname, "partials"),
		}),
	],
});
