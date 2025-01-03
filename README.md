# Doitsukani ドイツ蟹

![Deployment](https://github.com/eickler/doitsukani/actions/workflows/web.yml/badge.svg)

[Doitsukani](https://eickler.github.io/doitsukani) is a tool to add German translations to the vocabulary of the [Wanikani](https://wanikani.com) Japanese training app. It is based on EDICT2 files from the [Wadoku project](https://www.wadoku.de/wiki/display/WAD/Downloads+und+Links).

## How can I use it?

- Log in to your Wanikani account and create an API token: [https://www.wanikani.com/settings/personal_access_tokens]. Tick the "study_material:create" and "study_materials:update" boxes.
- Copy the token and paste it into https://eickler.github.io/doitsukani/.
- Click "Add translations" to add German translations, or "Remove translations" to remove them.
- Wait ... (The "ETA" indicates when the upload is estimated to be through.)
- Check some vocabulary in your favorite Wanikani app.

<p>
  <img src="img/durtles.jpg" width="150" style="vertical-align: middle;"/>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="img/wanikani.png" width="200" style="vertical-align: middle;"/>
</p>

Notes:

- Only vocabulary that is not yet burned is translated.
- The update can take more than one hour if you have not burned anything yet. This is because Wanikani only permits one update per second roughly.
- Existing user synonyms are not overwritten.
- There is currently no delete option to remove the synonyms.
- If you close the browser during the update, the application will simply stop. If you want to continue, just run it again. The application will resume from where it left off.

Limitations:

- There are about 100 vocabulary items that do not have a counterpart in Wadoku.
- Wadoku has a LOT of alternative translations for many words. To not add tens of synonyms, I am using a small heuristic to add up to eight translations as they are.
- Wadoku has quite some spelling mistakes in the text.
- The tool currently cannot distinguish between synonyms that were added by the user and synonyms that were added by the app but have been fixed meanwhile. However, I would not like to overwrite synonyms of the user.
