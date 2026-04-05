import re
import random

def parse(text: str) -> str:
    """
    Parses a spintax string and returns a randomized version.
    Supports nested spintax like {A|B|{C|D}}.
    """
    if not text:
        return ""
    
    # regex to find the innermost {A|B|C} patterns
    # [^{}]* means any character except { or }
    regex = re.compile(r'\{([^{}]*)\}')
    
    while True:
        match = regex.search(text)
        if not match:
            break
        
        # Get the group 1 (content inside {}) and split by |
        options = match.group(1).split('|')
        # Pick one random option
        choice = random.choice(options)
        
        # Replace the match in the text
        # match.start() and match.end() give indices
        text = text[:match.start()] + choice + text[match.end():]
        
    return text

if __name__ == "__main__":
    # Small test
    test_str = "{Il|Lo} {servizio|prodotto} di {noleggio|affitto} a {Milano|Roma|{Napoli|Salerno}} è {fantastico|ottimo}."
    for _ in range(5):
        print(parse(test_str))
