from random import shuffle
from list_gen.listgen import SessionGenerator, save_list, NLP, \
                    MatchCriteria, MaxSyllableCriteria, \
                    MaxWordLengthCriteria, NoRepeatCriteria, \
                    MinDistanceCriteria, UniqueLettersCriteria, \
                    MinSyllableCriteria, MinWordLengthCriteria, \
                    ListGenerator
import time

class ReconstructionSession(SessionGenerator):
    def __init__(self, word_path, condition, practice=False, distance_matrix=None, var="pregenerated_lists"):
        with open(word_path, "r") as f:
            corpus = f.readlines()

        corpus = [w.strip().lower() for w in corpus]

        if distance_matrix is None:
            distance_matrix = NLP.distance_matrix(corpus, delete=True)

            filename = time.strftime("%Y%m%d-%H%M%S") + "_distance_matrix.pkl"
            NLP.save_distance_matrix(distance_matrix, filename)
        else:
            distance_matrix = NLP.load_distance_matrix(distance_matrix)

        criteria = MatchCriteria( MaxSyllableCriteria(2),                          \
                                  MaxWordLengthCriteria(thresh=7),                 \
                                  MinDistanceCriteria(distance_matrix, thresh=.3), \
                                  NoRepeatCriteria() )

        list_lengths = [8, 12, 16]

        if condition == 0:
            list_repeats = 8
            conditions = {'pos': ['temporal'], 'max_list': [16]}

        elif condition == 1:
            list_repeats = 8
            conditions = {'pos': ['spatial'], 'max_list': [16]}

        if practice:
            list_repeats = 1

        list_gen = ListGenerator(corpus, criteria.filter)
        super().__init__(list_gen, list_lengths, list_repeats, var=var, **conditions)

if __name__ == "__main__":
    # lists 0
    practice_lists = ReconstructionSession("./practice_wordpool.txt", 0, practice=True, var="pregenerated_practice_lists").generate_session()
    sess_gen = ReconstructionSession("./wordpool.txt", 0, practice=False, distance_matrix='/Users/ckeane1/Documents/MTurk_Experiments/OrderedRecall/list_gen/20200512-153110_distance_matrix.pkl')
    for i in range(100):
        save_list("OrderedRecallLists", 0, i, sess_gen.generate_session(), practice=practice_lists) 

    # lists 1
    practice_lists = ReconstructionSession("./practice_wordpool.txt", 1, practice=True, var="pregenerated_practice_lists").generate_session()
    sess_gen = ReconstructionSession("./wordpool.txt", 1, practice=False, distance_matrix='/Users/ckeane1/Documents/MTurk_Experiments/OrderedRecall/list_gen/20200512-153110_distance_matrix.pkl')
    for i in range(100):
        save_list("OrderedRecallLists", 1, i, sess_gen.generate_session(), practice=practice_lists) 
