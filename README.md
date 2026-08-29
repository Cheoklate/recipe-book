# My Recipe Book

A simple static recipe site, hosted on GitHub Pages. No build step, no server, no database — just HTML/CSS/JS reading from a JSON file.

## Adding a recipe

Open `data/recipes.json` and append a new object to the array, following this shape:

```json
{
  "id": "unique-url-safe-id",
  "title": "Recipe Title",
  "tags": ["dinner", "vegetarian"],
  "servings": 4,
  "servingUnit": "servings",
  "prepTime": "10 min",
  "cookTime": "20 min",
  "ingredients": [
    { "amount": 1, "unit": "cup", "item": "flour" },
    { "amount": 0.5, "unit": "tsp", "item": "salt" },
    { "amount": 2, "unit": "", "item": "eggs" }
  ],
  "instructions": [
    "First step.",
    "Second step."
  ],
  "notes": "Optional notes, or leave as an empty string."
}
```

Notes on fields:

- `id` must be unique and URL-safe (letters, numbers, hyphens) — it's used in the recipe's URL.
- `ingredients[].amount` should be a plain number (use decimals like `0.5` or `0.25`, not fractions) so the "scale servings" feature can do the math. Leave `amount` out (or use a non-numeric value) for "to taste" style ingredients.
- `tags` populate the filter buttons on the homepage automatically — reuse existing tags where it makes sense.
- `prepTime` and `cookTime` are optional — omit them if you don't have a good estimate.

### Multi-part recipes (marinade, sauce, etc.)

For a recipe with distinct components, add an optional `"group"` field to ingredient/instruction entries. Consecutive entries with the same group are rendered together under a heading; entries with no `group` render flat, so this is fully optional. Instructions can also be given as `{ "group": "...", "text": "..." }` objects instead of plain strings:

```json
{
  "ingredients": [
    { "group": "Marinade", "amount": 1, "unit": "tbsp", "item": "soy sauce" },
    { "group": "Marinade", "amount": 1, "unit": "tsp", "item": "sugar" },
    { "group": "Main", "amount": 500, "unit": "g", "item": "chicken thigh" }
  ],
  "instructions": [
    { "group": "Marinate", "text": "Mix the marinade and coat the chicken." },
    { "group": "Cook", "text": "Sear the chicken over medium heat." }
  ]
}
```

Commit and push the change; GitHub Pages will pick it up automatically after the push.

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages**.
3. Under **Source**, choose the `main` branch and `/ (root)` folder.
4. Save — GitHub will publish the site at `https://<username>.github.io/<repo-name>/`.
