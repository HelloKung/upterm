import * as _ from "lodash";
import * as i from "./Interfaces";
import Job from "./Job";
import {choice, token, executable, decorate, sequence, withoutSuggestions, string} from "./Parser";
import {commandDescriptions} from "./plugins/autocompletion_providers/Executable";
import {git} from "./plugins/autocompletion_providers/Git";
import {description} from "./plugins/autocompletion_providers/Suggestions";
import {cd} from "./plugins/autocompletion_providers/Cd";
import {alias} from "./plugins/autocompletion_providers/Alias";
import {file} from "./plugins/autocompletion_providers/File";
import {npm} from "./plugins/autocompletion_providers/NPM";
import {rails} from "./plugins/autocompletion_providers/Rails";

const ls = executable("ls");
const exec = choice(_.map(commandDescriptions, (value, key) =>
    decorate(executable(key), description(value))
));

export const command = choice([
    ls,
    git,
    cd,
    npm,
    rails,
    sequence(executable("nvim"), file),
]);

const sudo = sequence(executable("sudo"), command);
const anyCommand = choice([
    sudo,
    command,
    exec,
    alias,
]);
const separator = choice([
    withoutSuggestions(token(string("&&"))),
    withoutSuggestions(token(string(";"))),
]);

const grammar = sequence(sequence(anyCommand, separator), anyCommand);

export default class Autocompletion implements i.AutocompletionProvider {
    static limit = 9;

    async getSuggestions(job: Job) {
        if (window.DEBUG) {
            /* tslint:disable:no-console */
            console.time(`suggestion for '${job.prompt.value}'`);
        }

        const results = await grammar({input: job.prompt.value, directory: job.session.directory, historicalCurrentDirectoriesStack: job.session.historicalCurrentDirectoriesStack});
        const suggestions = results.map(result => result.suggestions.map(suggestion => suggestion.withPrefix(result.parse)));
        const unique = _.uniqBy(_.flatten(suggestions), suggestion => suggestion.value).slice(0, Autocompletion.limit);

        if (window.DEBUG) {
            /* tslint:disable:no-console */
            console.timeEnd(`suggestion for '${job.prompt.value}'`);
        }

        return unique;
    }
}
