# ドイツ蟹　 Doitsukani

A little tool to add German translations to the vocabulary of the [Wanikani](https://wanikani.com) Japanese training app. It is based on EDICT2 files from the [Wadoku project](https://www.wadoku.de/wiki/display/WAD/Downloads+und+Links).

## How can I use it?

- Log in to your Wanikani account and create an API token: [https://www.wanikani.com/settings/personal_access_tokens].
- Copy the token and paste it into [https://eickler.github.io/doitsukani/].
- Click "Add translations" to add German translations, or "Remove translations" to remove them.
- Wait ...

Do not close the browser while the translations are added. The application just runs in your browser and does not run or store anything elsehwere. Hence, when you close the browser while the upload is still running, you will simply have not all translations uploaded. The process may take several minutes. (I deliberately made it a bit slower to not overload the Wanikani server.)

After everything completed, you should see German translations as "user synonyms" in your Wanikani app.

Limitations:

- There are about 100 vocabulary items that do not have a counterpart in Wadoku.
- Wadoku has a LOT of alternative translations for many words. To not add tens of synonyms, I am using a small heuristic to add up to three translations as they are. Any remaining translations are added as a potentially long single user synonym.
