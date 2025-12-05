/**
 * Text manipulation utilities for rich text spans
 */

import { TextSpan } from '../types';

export const deleteTextRange = (valueList: TextSpan[], start: number, end: number): TextSpan[] => {
  if (start >= end) return valueList;
  let currentPos = 0;
  const newValueList: TextSpan[] = [];

  valueList.forEach(span => {
    const spanStart = currentPos;
    const spanLength = span.text.length;
    const spanEnd = spanStart + spanLength;
    currentPos += spanLength;

    if (spanEnd <= start || spanStart >= end) {
      newValueList.push(span);
      return;
    }

    const relativeStart = Math.max(0, start - spanStart);
    const relativeEnd = Math.min(spanLength, end - spanStart);
    const newText = span.text.slice(0, relativeStart) + span.text.slice(relativeEnd);
    
    if (newText.length > 0) {
      newValueList.push({ ...span, text: newText });
    }
  });

  if (newValueList.length === 0 && valueList.length > 0) {
    return [{ ...valueList[0], text: "" }];
  } else if (newValueList.length === 0) {
    return [{ text: "", fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
  }
  return newValueList;
};

export const insertTextAt = (valueList: TextSpan[], index: number, textToInsert: string): TextSpan[] => {
  let currentPos = 0;
  const newValueList: TextSpan[] = [];
  let inserted = false;

  if (valueList.length === 0) {
    return [{ text: textToInsert, fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
  }

  const totalLength = valueList.reduce((acc, s) => acc + s.text.length, 0);
  if (index >= totalLength) {
    const lastSpan = valueList[valueList.length - 1];
    const newList = [...valueList];
    newList[newList.length - 1] = { ...lastSpan, text: lastSpan.text + textToInsert };
    return newList;
  }

  valueList.forEach(span => {
    const spanStart = currentPos;
    const spanLength = span.text.length;
    const spanEnd = spanStart + spanLength; 

    if (!inserted) {
      const isInside = index > spanStart && index < spanEnd;
      const isAtStart = index === spanStart && index === 0;
      const isAtEnd = index === spanEnd;

      if (isInside || isAtStart || isAtEnd) {
        const relIndex = index - spanStart;
        const newText = span.text.slice(0, relIndex) + textToInsert + span.text.slice(relIndex);
        newValueList.push({ ...span, text: newText });
        inserted = true;
      } else {
        newValueList.push(span);
      }
    } else {
      newValueList.push(span);
    }
    currentPos += spanLength;
  });

  if (!inserted) {
    const lastSpan = valueList[valueList.length - 1];
    newValueList[newValueList.length - 1] = { ...lastSpan, text: lastSpan.text + textToInsert };
  }

  return newValueList;
};

export const applyStyleToRange = (
  valueList: TextSpan[], 
  start: number, 
  end: number, 
  styleKey: string, 
  styleValue: any
): TextSpan[] => {
  let currentPos = 0;
  const newValueList: TextSpan[] = [];

  valueList.forEach((span) => {
    const spanStart = currentPos;
    const spanEnd = currentPos + span.text.length;
    const spanLength = span.text.length;

    if (spanEnd <= start || spanStart >= end) {
      newValueList.push(span);
    } 
    else {
      const relativeStart = Math.max(0, start - spanStart);
      const relativeEnd = Math.min(spanLength, end - spanStart);

      if (relativeStart > 0) {
        newValueList.push({ ...span, text: span.text.slice(0, relativeStart) });
      }

      const newSpan: TextSpan = {
        ...span,
        text: span.text.slice(relativeStart, relativeEnd),
        [styleKey]: styleValue
      };
      
      newValueList.push(newSpan);

      if (relativeEnd < spanLength) {
        newValueList.push({ ...span, text: span.text.slice(relativeEnd) });
      }
    }
    currentPos += spanLength;
  });

  return newValueList.filter(s => s.text.length > 0);
};

