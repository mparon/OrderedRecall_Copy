    console.log(condition, counterbalance); //checking the conditions and counterbalance variables in the developer tools console

async function runExperiment() {
    // PSITURK IMPORTS
    let psiturk = new PsiTurk(uniqueId, adServerLoc, mode);

    // Record screen resolution & available screen size
    psiturk.recordUnstructuredData('screen_width', screen.width)
    psiturk.recordUnstructuredData('screen_height', screen.height)
    psiturk.recordUnstructuredData('avail_screen_width', screen.availWidth)
    psiturk.recordUnstructuredData('avail_screen_height', screen.availHeight)
    psiturk.recordUnstructuredData('color_depth', screen.colorDepth)
    psiturk.recordUnstructuredData('pixel_depth', screen.pixelDepth)

    let pages = [
    ];

    psiturk.preloadPages(pages);

    // PARAMETERS
    let post_rec_dur = 1000; // Duration of blank screen after recall period
    let warning_duration = 5000;

    let isi = 400; // Inter-stimulus interval
    let isi_jitter = 400; // Jitter on the ISI
    let pr = 1400; // duration of stimulus presentation

    let pre_recall_delay = 1200; // Extra delay after the final word in a list
    let pre_recall_jitter = 200; // Jitter on the pre-recall delay
    let post_countdown_delay = 1500; // Delay between the pre-list countdown and first presentation

    console.log(condition, counterbalance); //checking the conditions and counterbalance variables in the developer tools console

    let central_display = condition % 2 < 1;
    let read_aloud = condition % 4 < 2;
    let keys = ['a', 'l'];

    // variables to cache values while iterating over list
    // during encoding
    let stimulusGenerator = null;
    let stimulusGeneratorValue = null;

    await loadSession(condition % 2, counterbalance);
    console.log(condition, counterbalance); //checking the conditions and counterbalance variables in the developer tools console

var t1 = [];                   // timeline of message
    // Mike/Ricardo message
    var message = {
        type: "html-button-response",
        stimulus: "<p style = 'text-align:left;'>Dear Participant,<br>\
        The study you are about to begin will provide scientific data on how people learn and \
        remember information. It is very important that you pay attention throughout the task and follow \
        the instructions to the best of your ability. If you take notes, or otherwise disrupt the quality \
        of the data, then we will have to discard it, and you will not be invited to future experiments \
        produced by our laboratory. By analyzing your results, we will know whether you have provided us with valid \
        data, and this may impact your compensation at the end of the experiment, as well as your ability to participate \
        in our lab's future experiments. We ask that you find a quiet room where you can perform this task without \
        any interruptions. If you are willing and able to fulfill the requirements of this study as explained, click \
        the word 'Blue' below. Your data will be of great value to the scientific community and we thank you for your participation.<br>\
        Sincerely,<br>\
        <i>Michael J. Kahana, Ph.D.</i><br>\
        Director of the Computational Memory Lab</p>",
        choices: ['Blue', 'Orange'],
        on_finish: function(data){
            var resp = data.button_pressed;
        console.log(resp);    //checking for error
            if(resp == "0"){
                data.color = 'Blue';         // correct answer
            } else {
                data.color = 'Orange';       // wrong answer
            };
        }
    };
    t1.push(message);

    // TODO: ask them to return the HIT due to failed attention check
    let fail_message = {
        type: 'html-keyboard-response',
        response_ends_trial: false,
        stimulus: "<p>The preceding page was designed to screen participants who are not carefully paying attention.</p> \
        <p>Please do not reload the page.</p> \
        <p>Based on your responses to these questions, we ask that you return this HIT to MTurk at this time.</p>"
    };

    // check if correctly responded to message
    let message_node = {
        timeline: [fail_message],
        conditional_function: function(){
            // get the data from the previous trial,
            // and check which key was pressed
            var data = jsPsych.data.get().last(1).values()[0];
            if(data.button_pressed == "0") {
                return false;
            } else {
                return true;
            }
        }
    };
    t1.push(message_node);

    let timeline_all = [
            jsPsychUtils.get_attention_check(),
            // jsPsychUtils.get_audio_test(),
            {
                // INSTRUCTIONS
                timeline: [
                    {
                        type: 'instructions',
                        key_forward: ' ',
                        allow_backward: false,
                        pages: instruction_pages,
                        data: { type: 'instructions' },
                        on_finish: function (data) { psiturk.finishInstructions(); }
                    },
                    {
                        type: 'html-keyboard-response',
                        stimulus: '<p class="inst">Press \'R\' to repeat the instructions or \'C\' to start the practice trials.</p>',
                        choices: ['r', 'c'],
                    },
                ],
                loop_function: function (data) {
                   if ('r' == data.last(1).values()[0].key_press) {
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            // PRACTICE
            {
                timeline_variables: pregenerated_practice_lists,
                timeline: [
                    {
                        type: 'hold-keys',
                        response_ends_trial: true,
                        choices: keys,
                        stimulus: continue_prompt,
                        data: { type: "list_start" }
                    },
                    {
                        type: 'countdown',
                        seconds: 10,
                        post_trial_gap: post_countdown_delay,
                        data: { type: 'countdown' }
                    },
                    {
                        // NOTE: the need for these generators is due to a lack of support/bug in jsPsych for dynamic
                        // nested timelines. This should be theoretically possible but creates a cyclic dependency in
                        // jsPsych. Until such a time as we can fix that, these generators are our solution.
                        conditional_function: function () {
                            // the conditional function is called before the first iteration
                            // and does first time setup
                            if (stimulusGenerator == null) {
                                stimulusGenerator = listParametersGenerator(jsPsych.timelineVariable("words", true),
                                                                            jsPsych.timelineVariable("conditions", true));

                                stimulusGeneratorValue = stimulusGenerator.next();
                            }

                            return !stimulusGeneratorValue.done
                        },
                        loop_function: function (data) {
                            // The loop function is always called after each iteration
                            // and can updated the value for the next trial
                            stimulusGeneratorValue = stimulusGenerator.next();

                            // clean up generator when it's done
                            if (stimulusGeneratorValue.done) { stimulusGenerator = null; }

                            return !stimulusGeneratorValue.done
                        },
                        timeline: [
                            {
                                type: 'positional-html-display',
                                highlight_col: true,
                                trial_duration: function () { return pr + isi + randomInt(0, isi_jitter) },
                                stimulus_duration: pr,
                                response_ends_trial: false,
                                choices: keys,
                                stimulus: function() {return stimulusGeneratorValue.value.stimulus},
                                placeholder: "<p class='stim'>&nbsp;</p>",
                                grid_cols: 3,
                                grid_rows: function() {return stimulusGeneratorValue.value.grid_rows},
                                col: 2,
                                row: function() {return stimulusGeneratorValue.value.row},
                                data: {
                                    type: "encoding",
                                    length: function () { return jsPsych.timelineVariable('words', true).length },
                                    conditions: jsPsych.timelineVariable('conditions')
                                },
                            }
                        ]
                    },
                    // CONDITIONAL WARNING GROUP
                    {
                        conditional_function: function () { return hold_keys },
                        timeline: [
                            {
                                type: 'hold-keys-check',
                                message_true: "<p class='inst'>You may release the keys once the study period has ended.</p>",
                                message_false: "<p class='inst'>Please remember to hold the keys throughout the study period.</p>",
                                trial_duration: warning_duration,
                                keys: keys,
                                data: { type: 'check' }
                            }
                        ]
                    },
                    {
                        conditional_function: function () { return !hold_keys },
                        timeline: [
                            {
                                type: 'hold-keys-check',
                                message_true: "",
                                message_false: "",
                                trial_duration: 0,
                                keys: keys,
                                data: { type: 'check' }
                            }
                        ]
                    },
                    // END CONDITIONAL GROUP
                    {
                        type: 'my-free-sort',
                        post_trial_gap: post_rec_dur,
                        placeholder: "<p class='stim'>&nbsp;</p>",
                        list_length: function() {return jsPsych.timelineVariable('conditions', true).max_list},
                        stimuli: function () {
                            return addRecallHTMLTags(
                                non_mutating_sort(
                                    jsPsych.timelineVariable('words', true)))
                        },
                        data: {
                            type: "recall",
                            length: function () { return jsPsych.timelineVariable('words', true).length },
                            conditions: jsPsych.timelineVariable('conditions')
                        },
                        on_finish: function () {
                            psiturk.saveData();
                        }
                    },
                ]
            },
            // START TASK
            {
                type: 'html-keyboard-response',
                stimulus: "<p class='inst'>Press space to continue on to the main task.",
                response_ends_trial: true,
                choices: [' ']
            },
            // TEST
            {
                timeline_variables: pregenerated_lists,
                timeline: [
                    {
                        type: 'hold-keys',
                        response_ends_trial: true,
                        choices: keys,
                        stimulus: continue_prompt,
                        data: { type: "list_start" }
                    },
                    {
                        type: 'countdown',
                        seconds: 10,
                        post_trial_gap: post_countdown_delay,
                        data: { type: 'countdown' }
                    },
                    {
                        // NOTE: the need for these generators is due to a lack of support/bug in jsPsych for dynamic
                        // nested timelines. This should be theoretically possible but creates a cyclic dependency in
                        // jsPsych. Until such a time as we can fix that, these generators are our solution.
                        conditional_function: function () {
                            // the conditional function is called before the first iteration
                            // and does first time setup
                            if (stimulusGenerator == null) {
                                stimulusGenerator = listParametersGenerator(jsPsych.timelineVariable("words", true),
                                                                            jsPsych.timelineVariable("conditions", true));
                                stimulusGeneratorValue = stimulusGenerator.next();
                            }

                            return !stimulusGeneratorValue.done
                        },
                        loop_function: function (data) {
                            // The loop function is always called after each iteration
                            // and can updated the value for the next trial
                            stimulusGeneratorValue = stimulusGenerator.next();

                            // clean up generator when it's done
                            if (stimulusGeneratorValue.done) { stimulusGenerator = null; }

                            return !stimulusGeneratorValue.done
                        },
                        timeline: [
                            {
                                type: 'positional-html-display',
                                highlight_col: true,
                                trial_duration: function () { return pr + isi + randomInt(0, isi_jitter) },
                                stimulus_duration: pr,
                                response_ends_trial: false,
                                choices: keys,
                                stimulus: function() {return stimulusGeneratorValue.value.stimulus},
                                placeholder: "<p class='stim'>&nbsp;</p>",
                                grid_cols: 3,
                                grid_rows: function() {return stimulusGeneratorValue.value.grid_rows},
                                col: 2,
                                row: function() {return stimulusGeneratorValue.value.row},
                                data: {
                                    type: "encoding",
                                    length: function () { return jsPsych.timelineVariable('words', true).length },
                                    conditions: jsPsych.timelineVariable('conditions')
                                },
                            }
                        ]
                    },
                    {
                        type: 'hold-keys-check',
                        message_true: "",
                        message_false: "",
                        trial_duration: 0,
                        keys: keys,
                        data: { type: 'check' }
                    },
                    {
                        type: 'my-free-sort',
                        post_trial_gap: post_rec_dur,
                        placeholder: "<p class='stim'>&nbsp;</p>",
                        list_length: function() {return jsPsych.timelineVariable('conditions', true).max_list},
                        stimuli: function () {
                            return addRecallHTMLTags(
                                non_mutating_sort(
                                    jsPsych.timelineVariable('words', true)))
                        },
                        data: {
                            type: "recall",
                            length: function () { return jsPsych.timelineVariable('words', true).length },
                            conditions: jsPsych.timelineVariable('conditions')
                        },
                        on_finish: function () {
                            psiturk.saveData();
                            jsPsych.setProgressBar(jsPsych.getProgressBarCompleted()
                                + 1 / pregenerated_lists.length);
                        }
                        //dont add here, black screen is blank

                    },
                    //dont add here, black screen is blank
                ]
                //dont add here, black screen is blank
            },
        ];

//survey questions (in timeline makes them required)

let age_question = {
      type: 'survey-dropdown',
      questions: [
        { 
          required: true,
          prompt: '<div style="text-align:center;"><p>Congratulations on finishing the experiment!</p> <p>There are a few more questions to answer prior to completion of your HIT. Please note that your answers to these questions will not affect acceptance of your HIT.</p> 1. What is your age?', 
          name: 'age',
          options:['18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49',
          '50','51','52','53','54','55','56','57','58','59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83',
          '84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99', '100'],
          horizontal: true,
        },
      ]
    };
    timeline_all.push(age_question);
    
    let gender_question = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">2. What is your gender?', 
          name: 'gender',
          options: ['Male', 'Female', 'Prefer not to answer'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(gender_question);
    
    let us_question = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">3. What is your country of origin?', 
          name: 'us',
          options: ["United States", "Other"], 
          required: true,
          horizontal: true,
        },
      ]
    };
    timeline_all.push(us_question);
    
    let country_question = {
      type: 'survey-text',
      questions: [
        {
          prompt: '<div style="text-align:center;"> If you responded "other" to the previous question, what is your country of origin?', 
          name: 'country',
        },
      ]
    };
    timeline_all.push(country_question);
    
    let race_question = {
      type: 'survey-dropdown',
      questions: [
        {
          prompt: '<div style="text-align:center;">4. What is your race?', 
          name: 'race',
          options: ["American Indian or Alaskan Native", "Asian", "Black or African American", "Native Hawaiian or Pacific Islander", "White", "Other"],
          required: true,
        },
      ]
    };
    timeline_all.push(race_question);
    
    let ethnicity_question = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">5. Are you of Hispanic or Latino origin?', 
          name: 'ethnicity', 
          options: ['Yes, I am of Hispanic or Latino origin', 'No, I am not of Hispanic or Latino origin'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(ethnicity_question);
    
    let first_language = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">6. What is your first language?', 
          name: 'first_language',
          options: ['English', 'Other'],
          required: true,
          horizontal: true,
        },
      ]
    };
    timeline_all.push(first_language);
    
    let other_language = {
      type: 'survey-text',
      questions: [
        {
          prompt: '<div style="text-align:center;"> If you responded "other" to the previous question, what is your first language?', 
          name: 'other_language',
        },
      ]
    };
    timeline_all.push(other_language);
    
    let education_question = {
      type: 'survey-dropdown',
      questions: [
        {
          prompt: '<div style="text-align:center;">7. What is the highest degree or level of schooling you have completed?', 
          name: 'education', 
          options: ['Less than a high school diploma', 'High school diploma or equivalent (e.g. GED)', 'Some college', 
          'Associate degree', "Bachelor's degree", 'Some graduate education', "Master's degree", 'Doctorate degree', 
          'Prefer Not to Answer'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(education_question);
    
    let marital_question = {
      type: 'survey-dropdown',
      questions: [
        {
          prompt: '<div style="text-align:center;">8. What is your marital status?', 
          name: 'marital', 
          options: ['Single (never married)', 'Married/Domestic Partnership', 'Widowed', 
          'Divorced', "Separated",'Prefer Not to Answer'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(marital_question);

    let wrote_notes = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">9. Did you write down or type any notes to help you remember words?</p><p>This may include writing the words themselves, recording the first/last letter of each word, or any similar strategy.', 
          name: 'wrote_notes', 
          options: ['Yes', 'No'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(wrote_notes);

    let top_to_bottom_strat = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">10. Regardless of correctness, did you generally start by placing a word in the top box, next place a word in the second box, and then continue down the list until you reach the bottom box?', 
          name: 'top_to_bottom_strat', 
          options: ['Yes', 'No'], 
          required: true,
          horizontal: true
        },
      ],
    };
    timeline_all.push(top_to_bottom_strat);

    let reason_top_bottom_strat = {
      type: 'survey-text',
      questions: [
        {
          prompt: '<div style="text-align:center;">11. If you did use the top-to-bottom strategy just described, then please explain why you chose it.', 
          name: 'reason_top_bottom_strat', 
          horizontal: true   
        },
      ],
    };
    timeline_all.push(reason_top_bottom_strat);

    let must_start_top_to_bottom = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">12. Did you think that you were supposed to recall the words from top to bottom?', 
          name: 'must_start_top_to_bottom',
          options: ['Yes', 'No'],
          required: true,
          horizontal: true  
        },
      ],
    };
    timeline_all.push(must_start_top_to_bottom);

    let can_use_any_order = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">13. Did you understand that you could fill in the boxes in any order you wanted?', 
          name: 'can_use_any_order', 
          options: ['Yes', 'No'], 
          required: true,
          horizontal: true 
        }
      ],
    };
    timeline_all.push(can_use_any_order);
    
    let visualizing_question = {
        type: 'html-slider-response',
        stimulus:'<div style="text-align:center;">Which strategies did you find helpful as you studied the lists of words during this task? Click on the line below to indicate, on a scale of Never to Always, how often you used each of the following strategies:</p><p>14. Visualizing or forming a mental image of studied words to help solidify them in your mind',
        name : 'visualizing_question',
        require_movement: true,
        labels: ['Never', 'Half of the Time', 'Always']
    };
    timeline_all.push(visualizing_question);

    let story_question = {
        type: 'html-slider-response',
        stimulus:'<div style="text-align:center;">Which strategies did you find helpful as you studied the lists of words during this task? Click on the line below to indicate, on a scale of Never to Always, how often you used each of the following strategies:</p><p>15. Creating a story or sentence to help connect the words in a list',
        name:'story_question',
        require_movement: true,
        labels: ['Never', 'Half of the Time', 'Always']
    };
    timeline_all.push(story_question);

    let grouping_question = {
        type: 'html-slider-response',
        stimulus:'<div style="text-align:center;">Which strategies did you find helpful as you studied the lists of words during this task? Click on the line below to indicate, on a scale of Never to Always, how often you used each of the following strategies:</p><p>16. Grouping words with similar meanings into categories (e.g. animals, tools, people)',
        name: 'grouping_question',
        require_movement: true,
        labels: ['Never', 'Half of the Time', 'Always']
    };
    timeline_all.push(grouping_question);

    let rehearsal_question = {
        type: 'html-slider-response',
        stimulus:'<div style="text-align:center;">Which strategies did you find helpful as you studied the lists of words during this task? Click on the line below to indicate, on a scale of Never to Always, how often you used each of the following strategies:</p><p>17. Repeating earlier words to yourself while studying later words',
        name: 'rehearsal_question',
        require_movement: true,
        labels: ['Never', 'Half of the Time', 'Always']
    };
    timeline_all.push(rehearsal_question);

    let imagining_question = {
        type: 'html-slider-response',
        stimulus:'<div style="text-align:center;">Which strategies did you find helpful as you studied the lists of words during this task? Click on the line below to indicate, on a scale of Never to Always, how often you used each of the following strategies:</p><p>18. Imagining words in different locations along a road or within a familiar environment',
        name: 'imagining_question',
        require_movement: true,
        labels: ['Never', 'Half of the Time', 'Always']
    };
    timeline_all.push(imagining_question);

    let strat_other = {
        type: 'survey-text',
        questions:[
        {
          prompt: '<div style="text-align:center;">19. If you used any strategies other than those previously listed, please describe them in the text box provided:', 
          name: 'strat_other',
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(strat_other);

    let distracted = {
      type: 'survey-multi-choice',
      questions: [
        {
          prompt: '<div style="text-align:center;">20. Were you engaged in any other activities (e.g. watching TV, talking with someone, working on other HITs, etc.) while working on the experiment?', 
          name: 'distracted', 
          options: ['Yes', 'No'], 
          required: true,
          horizontal: true
        }, 
      ],
    };
    timeline_all.push(distracted);
    
    let finish_question = {
      type: "html-button-response",
      stimulus: '<div style="text-align:center;">Congratulations! You have completed our HIT. After this question, you may exit out of the window. Would you like to be considered for other HITs from this requester?',
      choices: ['yes', 'no'],
      data: {block_number: 3,
      required: true,
      },
      on_finish: function(data) {
          if (data.button_pressed == '0') {
              data.further_experiments = 'yes';
          } else if (data.button_pressed = '1')  {
              data.further_experiments = 'no';
          }
      }
    };
    timeline_all.push(finish_question);

    var tot_timeline = t1.concat(timeline_all);     // new total timeline with message at start


    /* - - - - EXECUTION - - - - */
    psiturk.startTask();
    jsPsych.init({
        timeline: tot_timeline,
        on_finish: function () {
            //Questionnaire(psiturk);
            psiturk.saveData();
            psiturk.completeHIT()
        },
        on_data_update: function (data) {
            psiturk.recordTrialData(data);
            psiturk.saveData();
        },

        show_progress_bar: true,
        auto_update_progress_bar: false,

        exclusions: {
            min_width: 900,
            min_height: 700
        }
    });
}
