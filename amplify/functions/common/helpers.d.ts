import { Callback, Context } from 'aws-lambda';

/**
 * This file is needed to circumvent Typescript type mismatch error
 * for the variables that we don't care and thus, assign to NULL.
 * The idea is taken from:
 * https://stackoverflow.com/a/52910794/2116562
 */

declare const context: Context;
declare const callback: Callback;