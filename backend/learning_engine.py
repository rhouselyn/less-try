from typing import List, Dict, Any, Tuple
import random
import json
from pathlib import Path


class LearningEngine:
    def __init__(self, storage):
        self.storage = storage
        self.MODULE_SIZE = 8  # 8-word module progression
    
    def check_coverage(self, file_id: str, user_progress: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check coverage algorithm to determine mastery of words
        Returns a dictionary with coverage metrics and recommendations
        """
        # Load vocabulary
        vocab = self.storage.load_vocab(file_id)
        if not vocab:
            return {
                "coverage": 0.0,
                "mastered": 0,
                "total": 0,
                "recommendations": []
            }
        
        # Load user progress
        progress = user_progress or {}
        
        # Calculate coverage
        total_words = len(vocab)
        mastered_words = 0
        
        for word_entry in vocab:
            word = word_entry["word"]
            if word in progress:
                word_progress = progress[word]
                # Consider a word mastered if it has at least 3 correct answers
                if word_progress.get("correct", 0) >= 3:
                    mastered_words += 1
        
        coverage = (mastered_words / total_words) * 100 if total_words > 0 else 0.0
        
        # Generate recommendations
        recommendations = []
        if coverage < 100:
            # Recommend words with low mastery
            for word_entry in vocab:
                word = word_entry["word"]
                if word not in progress or progress[word].get("correct", 0) < 3:
                    recommendations.append(word_entry)
        
        return {
            "coverage": coverage,
            "mastered": mastered_words,
            "total": total_words,
            "recommendations": recommendations[:10]  # Top 10 recommendations
        }
    
    def get_next_module(self, file_id: str, user_progress: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get the next 8-word module based on user progress
        """
        # Load vocabulary
        vocab = self.storage.load_vocab(file_id)
        if not vocab:
            return {
                "module": [],
                "module_number": 0,
                "total_modules": 0
            }
        
        # Load user progress
        progress = user_progress or {}
        
        # Calculate total modules
        total_modules = (len(vocab) + self.MODULE_SIZE - 1) // self.MODULE_SIZE
        
        # Find the next module to study
        # First, check for modules with unmastered words
        for module_num in range(total_modules):
            start_idx = module_num * self.MODULE_SIZE
            end_idx = min(start_idx + self.MODULE_SIZE, len(vocab))
            module_words = vocab[start_idx:end_idx]
            
            # Check if any word in this module is not mastered
            has_unmastered = False
            for word_entry in module_words:
                word = word_entry["word"]
                if word not in progress or progress[word].get("correct", 0) < 3:
                    has_unmastered = True
                    break
            
            if has_unmastered:
                return {
                    "module": module_words,
                    "module_number": module_num + 1,
                    "total_modules": total_modules
                }
        
        # If all modules are mastered, return the first module for review
        return {
            "module": vocab[:self.MODULE_SIZE],
            "module_number": 1,
            "total_modules": total_modules
        }
    
    def generate_dynamic_sentences(self, file_id: str, words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate dynamic sentences using the given words
        """
        # Load sentences
        sentences_data = self.storage.load_pipeline_data(file_id)
        if not sentences_data:
            return []
        
        # Extract original sentences
        original_sentences = [s.get("sentence", "") for s in sentences_data if "sentence" in s]
        
        # Generate sentences for each word
        dynamic_sentences = []
        for word_entry in words:
            word = word_entry["word"]
            
            # Find sentences that contain the word
            matching_sentences = []
            for sentence in original_sentences:
                if word.lower() in sentence.lower():
                    matching_sentences.append(sentence)
            
            # If no matching sentences, use a generic sentence
            if not matching_sentences:
                sentence = f"This is a sentence using the word '{word}'."
            else:
                # Select a random matching sentence
                sentence = random.choice(matching_sentences)
            
            dynamic_sentences.append({
                "word": word,
                "sentence": sentence,
                "translation": word_entry.get("context_meaning", "")
            })
        
        return dynamic_sentences
    
    def generate_quiz(self, file_id: str, words: List[Dict[str, Any]], quiz_type: str = "multiple_choice") -> List[Dict[str, Any]]:
        """
        Generate quiz questions for the given words
        """
        from nvidia_api import NvidiaAPI
        nvidia_api = NvidiaAPI()
        
        # Load context from sentences
        sentences_data = self.storage.load_pipeline_data(file_id)
        context = " ".join([s.get("sentence", "") for s in sentences_data if "sentence" in s])
        
        # Get language information
        metadata = self.storage.load_file_metadata(file_id)
        source_lang = metadata.get("source_language", "en")
        target_lang = metadata.get("target_language", "zh")
        
        # Generate quiz based on type
        if quiz_type == "multiple_choice":
            questions = nvidia_api.generate_multiple_choice(words, context, source_lang, target_lang)
        elif quiz_type == "matching":
            questions = nvidia_api.generate_matching(words, context, source_lang, target_lang)
        else:
            questions = []
        
        return questions
    
    def update_progress(self, file_id: str, word: str, is_correct: bool) -> Dict[str, Any]:
        """
        Update user progress for a word
        """
        # Load current progress
        progress = self.storage.load_progress(file_id)
        
        # Update word progress
        if word not in progress:
            progress[word] = {
                "correct": 0,
                "incorrect": 0,
                "attempts": 0
            }
        
        progress[word]["attempts"] += 1
        if is_correct:
            progress[word]["correct"] += 1
        else:
            progress[word]["incorrect"] += 1
        
        # Save updated progress
        self.storage.save_progress(file_id, progress)
        
        return progress
    
    def get_user_progress(self, file_id: str) -> Dict[str, Any]:
        """
        Get user progress for all words
        """
        return self.storage.load_progress(file_id)
    
    def reset_progress(self, file_id: str) -> Dict[str, Any]:
        """
        Reset user progress for all words
        """
        # Save empty progress
        self.storage.save_progress(file_id, {})
        return {}
