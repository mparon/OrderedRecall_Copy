/**
 * jspsych-free-sort
 * plugin for drag-and-drop sorting of a collection of images
 * Josh de Leeuw
 *
 * documentation: docs.jspsych.org
 */

jsPsych.plugins['my-free-sort'] = (function() {

    var plugin = {};

    plugin.info = {
        name: 'my-free-sort',
        description: '',
        parameters: {
            stimuli: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Stimuli',
                default: undefined,
                array: true,
                description: 'Words to be shown'
            },
            placeholder: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'placeholder',
                default: undefined,
                array: true,
                description: 'Placeholder item for empty boxes'
            },
            list_length: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'List Length',
                default: null,
                description: 'The implicit number of slots for items',
            },
            button_label: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Button label',
                default:  'Submit',
                description: 'The text that appears on the button to continue to the next trial.'
            },
        }
    }

    function extractContent(s) {
        var span = document.createElement('span');
        span.innerHTML = s;
        return span.textContent || span.innerText;
    };

    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    plugin.trial = function(display_element, trial) {

        function get_placeholder() {
            let placeholder = htmlToElement(trial.placeholder);
            placeholder.classList.add("draggable-placeholder");
            return placeholder
        }

        function _emptyTarget(dropped) {

            // if element is being moved from target, empty original target
            if(dropped.parentNode.dataset.filled == "true") {
                let parent = dropped.parentNode;
                parent.dataset.filled = "false";

                parent.classList.add("draggable-empty");
                parent.classList.remove("draggable-filled");

                let child = parent.removeChild(dropped.parentNode.lastChild);
                parent.appendChild(get_placeholder());
                let source = document.getElementById(`draggable-container-${child.dataset.id}`);
                source.appendChild(child);
            }
        }

        function _fillTarget(target, dropped) {
            target.dataset.filled = "true";

            target.classList.add("draggable-filled");
            target.classList.remove("draggable-empty");

            // remove placeholder from target element
            target.removeChild(target.querySelector(".draggable-placeholder"));
            target.appendChild(dropped);
        }

        function dragstartHandler(ev) {
            ev.dataTransfer.setData("text/plain", ev.target.id)
            ev.dataTransfer.dropEffect = "move";

            let end_t = performance.now()
            RTs.push({
                'word': ev.target.innerHTML,
                'time': end_t-start_time,
                'target': ev.target.parentNode.dataset.id,
                'mode': 'leaving',
            })
        }

        function dragoverHandler(ev) {
            // let target_parent = document.getElementById(ev.dataTransfer.getData("text/plain")).parentNode;
            let valid_target = ev.currentTarget.classList.contains('jspsych-target') || 'jspsych-target' == ev.currentTarget.className

            // if(ev.currentTarget != target_parent && valid_target) {
            ev.preventDefault();
            if(valid_target) {
                ev.dataTransfer.dropEffect = "move";
            }
        }

        function dropHandler(ev) {
            ev.preventDefault();

            let dropped = document.getElementById(ev.dataTransfer.getData("text/plain"));
            if(ev.currentTarget.dataset.filled == "true") {
                // pop existing element back to start
                let bumped = ev.currentTarget.firstChild;
                _emptyTarget(bumped);

                // Log that word is bumped from position
                let end_t = performance.now()
                RTs.push({
                    'word': ev.currentTarget.firstChild.innerHTML,
                    'time': end_t-start_time,
                    'target': ev.currentTarget.dataset.id,
                    'mode': 'leaving',
                })
            }

            // clear parent opening for current item
            _emptyTarget(dropped)
            _fillTarget(ev.currentTarget, dropped);
        }

        function dragEndHandler(ev) {
            // handle end of drop

            let end_t = performance.now()
            if(ev.dataTransfer.dropEffect != 'move') {
                // snap back to start

                let dropped = ev.target;
                _emptyTarget(dropped)

                // not in target
                if(ev.target.parentNode.classList.contains('jspsych-target')
                || 'jspsych-target' == ev.target.parentNode.className) {
                          RTs.push({
                            'word': ev.target.innerHTML,
                            'time': end_t-start_time,
                            'target': -1,
                            'mode': 'dropped',
                          })
                }
                else {
                    RTs.push({
                      'word': ev.target.innerHTML,
                      'time': end_t-start_time,
                      'target': -1,
                      'mode': 'missed',
                    })
                }
            }
            else {
                    RTs.push({
                      'word': ev.target.innerHTML,
                      'time': end_t-start_time,
                      'target': ev.target.parentNode.dataset.id,
                      'mode': 'entering',
                    })
            }
        }

        let time_elapsed = jsPsych.totalTime();
        let start_time = performance.now(); //time elapsed since origin (window-load)
        let RTs = []; // array to store dragged responses


        if (trial.list_length == null) {
            trial.list_length = trial.stimuli.length;
        }

        // TODO: move this to css
        // TODO: coloring by css rule
        var css_grid = `display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(${trial.list_length}, 1fr); width: 80%; height: 90%; min-width: 200px; min-height: 200px; align-items: center; margin-left: auto; margin-right: auto; row-gap: .5em; col-gap: .5em;`

        let grid = document.createElement("div");
        grid.className = "grid-container";
        grid.style = css_grid;

        //create draggable-word-element containers
        for (var i = 0; i < trial.stimuli.length; i++) { 
            let draggable_container = document.createElement("div");
            draggable_container.style.cssText = `vertical-align: middle; grid-area: ${i + 1} / 2`;
            draggable_container.id = `draggable-container-${i}`;
            draggable_container.classList.add('draggable-container');

            let draggable_content = htmlToElement(trial.stimuli[i]);
            draggable_content.classList.add("jspsych-free-sort-draggable"); // is this used for styling?
            draggable_content.classList.add('draggable-item');
            draggable_content.style.cursor = "move";
            draggable_content.draggable = "true";
            draggable_content.id = `draggable-${i}`;
            draggable_content.dataset.id = `${i}`;
            draggable_content.addEventListener('dragstart', dragstartHandler);

            draggable_container.appendChild(draggable_content);
            grid.appendChild(draggable_container);

            let target = document.createElement("div");
            target.classList.add("jspsych-target");
            target.classList.add("draggable-empty");
            target.id = `target-container-${i}`;
            target.dataset.filled=false;
            target.style.cssText = `height: 100%; margin:0px; grid-area: ${i+1} / 4`;
            target.addEventListener('dragover', dragoverHandler);
            target.addEventListener('drop', dropHandler);

            target.appendChild(get_placeholder());
            grid.append(target);
        }
        document.addEventListener('dragend', dragEndHandler);

        let button = document.createElement('button');
        button.id = "jspsych-free-sort-done-btn";
        button.className = 'jspsych-btn';
        button.appendChild(document.createTextNode(trial.button_label));


        while (display_element.firstChild) {
            display_element.removeChild(display_element.lastChild);
        }
        display_element.appendChild(grid);
        display_element.appendChild(button);


        /*-----------------------------------------Continue Button: Ending the Experiment-----------------------------------------*/

        //continue button ends experiment, but only if all the boxes have been filled
        display_element.querySelector('#jspsych-free-sort-done-btn').addEventListener('click', function() { 

            let all_filled = true;
            let targets = display_element.querySelectorAll("[id^='target-container-']")

            targets.forEach(a => {
                if(a.dataset.filled != 'true') {
                    all_filled = false;
                }
            });

            if(!all_filled) {
                alert("fill all the boxes before pressing " + trial.button_label + "!");
                return;
            }

            var end_time = performance.now();

            //display original word order alongside new word order for easy order comparison
            original_wordorder = [];
            recalled_wordorder = [];
            for(var i=0; i<trial.stimuli.length; i++){
                original_wordorder.push(extractContent(trial.stimuli[i]));
                let recalled = document.getElementById(`target-container-${i}`).firstChild.innerHTML;
                recalled_wordorder.push(recalled);
            }

            var trial_data = {
                "original_wordorder": original_wordorder,
                "final_wordorder": recalled_wordorder,
                "drag_events": RTs,
                "start_time": time_elapsed
            }; 
            console.log(trial_data);

            jsPsych.finishTrial(trial_data);
        });
    };
    return plugin;
})();
