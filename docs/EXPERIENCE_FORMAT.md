# Experience Design Format

To design your interactive experience, create a JSON file following this format.

## Structure

### Metadata
- `title`: Name of the experience
- `duration`: Total duration in seconds
- `audioFile`: Path to audio file (optional)

### Timeline
An array of events that happen at specific timestamps. Each event has a `type`:

#### 1. Text Display (`"type": "text"`)
Shows text at a specific timestamp.

```json
{
  "type": "text",
  "time": 2,
  "text": "welcome"
}
```

#### 2. Text Input (`"type": "input"`)
Prompts user to enter text within a time window.

```json
{
  "type": "input",
  "time": 10,
  "label": "what's your first name?",
  "placeholder": "",
  "required": true,
  "storeAs": "name",
  "timeout": 30
}
```

- `time`: When the input appears
- `label`: Question/prompt text
- `placeholder`: Placeholder text (optional)
- `required`: Whether input is required
- `storeAs`: Variable name to store the value
- `timeout`: Auto-advance after X seconds (optional)

#### 3. Choice (`"type": "choice"`)
Presents 2-3 options for user to choose from.

```json
{
  "type": "choice",
  "time": 20,
  "question": "would you like to dig deeper?",
  "options": [
    {
      "text": "yes",
      "value": "yes",
      "leadsTo": "ending-deep"
    },
    {
      "text": "no",
      "value": "no",
      "leadsTo": "ending-simple"
    }
  ]
}
```

- `time`: When the choice appears
- `question`: Question text
- `options`: Array of 2-3 options
  - `text`: Display text
  - `value`: Stored value
  - `leadsTo`: Ending ID this choice leads to

### Endings
Array of possible endings based on user choices.

```json
{
  "id": "ending-deep",
  "title": "Deep Dive",
  "text": "Thank you for choosing to dig deeper!",
  "conditions": {
    "digDeeper": "yes"
  }
}
```

- `id`: Unique identifier (referenced in `leadsTo`)
- `title`: Ending title
- `text`: Ending message
- `conditions`: Variables that must match (optional)

## Example Workflow

1. Create a JSON file (e.g., `my-experience.json`)
2. Define your timeline with text, inputs, and choices
3. Define endings based on choice paths
4. Share the JSON file with me to integrate into the code

## Tips

- Timestamps should be in chronological order
- Use `storeAs` to save input values for later use
- Use `leadsTo` in choice options to create branching paths
- Endings are evaluated based on stored variables and choice values

