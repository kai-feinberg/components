'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { usePrompts } from "@/hooks/usePrompts"
import { usePromptUsageStore } from '@/stores/usePromptUsageStore'
import { Prompt } from '@/lib/types'
export default function InputWithShortcuts({
  submitForm,
  isLoading,
  handleInput,
  className,
  value = '',
}: {
  submitForm: () => void;
  isLoading: boolean;
  handleInput: (value: string) => void;
  className?: string;
  value?: string;
}) {
  const { prompts } = usePrompts();
  const promptUsageStore = usePromptUsageStore()

  
  const [inputValue, setInputValue] = useState('')
  const [showPopover, setShowPopover] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const isUserTriggered = useRef(false)

  // Add auto-resize functionality
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'inherit';
      textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
    };

    // Set initial height
    adjustHeight();

    // Create a new ResizeObserver
    const resizeObserver = new ResizeObserver(adjustHeight);
    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    setInputValue(newValue)
    handleInput(newValue)
    setCursorPosition(newCursorPosition)

    // Show popover when @ is typed
    const lastChar = newValue.slice(newCursorPosition - 1, newCursorPosition)
    if (lastChar === '@') {
      isUserTriggered.current = true
      setShowPopover(true)
    } else {
      setShowPopover(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open && !isUserTriggered.current) {
      return
    }
    setShowPopover(open)
    if (!open) {
      isUserTriggered.current = false
    }
  }

  const insertPrompt = useCallback((prompt: Prompt) => {
    const beforeCursor = inputValue.slice(0, cursorPosition - 1)
    const afterCursor = inputValue.slice(cursorPosition)
    const newValue = beforeCursor + prompt.content + afterCursor
    setInputValue(newValue)
    handleInput(newValue)
    setShowPopover(false)
    isUserTriggered.current = false

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursorPosition = beforeCursor.length + prompt.content.length
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
        setCursorPosition(newCursorPosition)
      }
    }, 0)

    promptUsageStore.incrementUsage(prompt)

  }, [inputValue, cursorPosition, handleInput])

  const handleSubmit = () => {
    if (!isLoading && inputValue.trim()) {
      const currentInput = inputValue // Store the current input value
      setInputValue('') // Clear the input
      handleInput('') // Clear the parent's input handler
      submitForm() // Submit the form
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setShowPopover(false)
      isUserTriggered.current = false
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
        textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowPopover(false)
        isUserTriggered.current = false
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Popover open={showPopover} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <div className="relative w-full max-w-2xl">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] w-full p-4 text-lg bg-userChats leading-relaxed resize-none overflow-hidden pb-4"
              placeholder="Start typing here... (Type @ to insert prompts)"
              rows={1}
            />
            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
              cmd+enter to send
            </div>
          </div>
          </PopoverTrigger>
        <PopoverContent className="w-full max-w-2xl p-0" align="start" ref={popoverRef}>
          <Command>
            <CommandInput placeholder="Search prompts..." />
            <CommandList>
              <CommandEmpty>No prompts found.</CommandEmpty>
              <CommandGroup heading="Prompts">
                {prompts.map((prompt) => (
                  <CommandItem
                    key={prompt.id}
                    onSelect={() => insertPrompt(prompt)}
                  >
                    {prompt.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}